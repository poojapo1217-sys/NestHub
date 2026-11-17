import type { Response } from 'express';
import { db, withTransaction } from '../config/db.ts';
import type { AuthenticatedRequest } from '../middleware/auth.ts';
import { createNotification, logAudit } from '../services/auditService.ts';
import {
  isNonEmptyString,
  VALID_COMPLAINT_CATEGORIES,
  VALID_COMPLAINT_PRIORITIES,
  VALID_COMPLAINT_STATUSES,
} from '../validators/validators.ts';

export async function listComplaints(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status.trim().toUpperCase() : '';
    const priority = typeof req.query.priority === 'string' ? req.query.priority.trim().toUpperCase() : '';
    const search = typeof req.query.search === 'string' ? req.query.search.trim().toLowerCase() : '';

    let sql = `
      SELECT c.complaint_id, c.complaint_code, c.tenant_id, c.room_id, c.category,
             c.title, c.description, c.complaint_date, c.status, c.priority, c.resolution_remarks,
             t.tenant_code, u.name as tenant_name, u.phone as tenant_phone,
             r.room_number
      FROM complaints c
      JOIN tenants t ON t.tenant_id = c.tenant_id
      JOIN users u ON u.user_id = t.user_id
      LEFT JOIN rooms r ON r.room_id = c.room_id
    `;
    const params: unknown[] = [];

    if (req.user?.role === 'TENANT') {
      sql += ' WHERE c.tenant_id = ?';
      params.push(req.user.tenant_id || -1);
    }

    sql += ' ORDER BY c.complaint_id DESC';

    const rows = await db.query<Record<string, unknown>>(sql, params);
    const filtered = rows.filter((row) => {
      if (status && status !== 'ALL' && String(row.status) !== status) return false;
      if (priority && priority !== 'ALL' && String(row.priority) !== priority) return false;
      if (search) {
        const hay = `${row.complaint_code} ${row.title} ${row.description} ${row.category} ${row.tenant_name} ${row.room_number || ''}`.toLowerCase();
        if (!hay.includes(search)) return false;
      }
      return true;
    });

    res.json({ complaints: filtered });
  } catch (err) {
    console.error('listComplaints error:', err);
    res.status(500).json({ error: 'Failed to load complaints.' });
  }
}

export async function createComplaint(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const body = req.body as {
      category?: string;
      title?: string;
      description?: string;
      room_number?: string;
      complaint_date?: string;
      priority?: string;
      tenant_id?: number;
    };

    const category = (body.category || '').trim();
    const title = (body.title || '').trim();
    const description = (body.description || '').trim();
    const complaintDate = body.complaint_date?.trim() || new Date().toISOString().slice(0, 10);
    const priority = (body.priority || 'MEDIUM').trim().toUpperCase();

    if (!VALID_COMPLAINT_CATEGORIES.has(category)) {
      res.status(400).json({ error: 'Please select a valid complaint category.' });
      return;
    }
    if (!isNonEmptyString(title) || !isNonEmptyString(description)) {
      res.status(400).json({ error: 'Complaint title and description are required.' });
      return;
    }
    if (!VALID_COMPLAINT_PRIORITIES.has(priority)) {
      res.status(400).json({ error: 'Invalid priority value.' });
      return;
    }

    let tenantId = req.user?.tenant_id || null;
    if (req.user?.role !== 'TENANT') {
      if (body.tenant_id) {
        tenantId = Number(body.tenant_id);
      } else {
        const firstTenant = await db.queryOne<{ tenant_id: number }>('SELECT tenant_id FROM tenants LIMIT 1');
        tenantId = firstTenant?.tenant_id || null;
      }
    }

    if (!tenantId) {
      res.status(400).json({ error: 'No tenant profile associated with this complaint.' });
      return;
    }

    let roomId: number | null = null;
    if (isNonEmptyString(body.room_number)) {
      const room = await db.queryOne<{ room_id: number }>('SELECT room_id FROM rooms WHERE room_number = ?', [
        body.room_number.trim(),
      ]);
      roomId = room?.room_id || null;
    } else {
      const stay = await db.queryOne<{ room_id: number }>(
        `SELECT b.room_id FROM stay_history sh
         JOIN beds b ON b.bed_id = sh.bed_id
         WHERE sh.tenant_id = ? AND sh.check_out IS NULL`,
        [tenantId]
      );
      roomId = stay?.room_id || null;
    }

    const created = await withTransaction(async (tx) => {
      const maxRow = await tx.queryOne<{ max_id: number }>(
        'SELECT COALESCE(MAX(complaint_id), 0) as max_id FROM complaints'
      );
      const nextNum = Number(maxRow?.max_id || 0) + 1;
      const year = complaintDate.slice(0, 4) || String(new Date().getFullYear());
      const complaintCode = `CMP-${year}-${String(nextNum).padStart(3, '0')}`;

      const insertRes = await tx.execute(
        `INSERT INTO complaints
         (complaint_code, tenant_id, room_id, category, title, description, complaint_date, status, priority, resolution_remarks)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, NULL)`,
        [complaintCode, tenantId, roomId, category, title, description, complaintDate, priority]
      );

      const managers = await tx.query<{ user_id: number }>("SELECT user_id FROM users WHERE role = 'MANAGER'");
      for (const m of managers) {
        await createNotification(
          m.user_id,
          `New ${priority} priority complaint ${complaintCode} (${category}): ${title}`,
          tx
        );
      }

      await logAudit(
        {
          userId: req.user?.user_id || null,
          action: 'CREATE_COMPLAINT',
          entityType: 'complaints',
          entityId: insertRes.insertId,
          details: `Logged complaint ${complaintCode} (${category}): ${title}`,
        },
        tx
      );

      return { complaint_id: insertRes.insertId, complaint_code: complaintCode };
    });

    res.status(201).json({
      message: `Complaint ${created.complaint_code} submitted successfully.`,
      complaint: created,
    });
  } catch (err) {
    console.error('createComplaint error:', err);
    res.status(500).json({ error: 'Failed to submit complaint.' });
  }
}

export async function updateComplaint(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id);
    const body = req.body as {
      status?: string;
      priority?: string;
      resolution_remarks?: string;
    };

    const existing = await db.queryOne<{
      complaint_id: number;
      complaint_code: string;
      tenant_id: number;
      status: string;
      priority: string;
      resolution_remarks: string | null;
    }>('SELECT * FROM complaints WHERE complaint_id = ?', [id]);

    if (!existing) {
      res.status(404).json({ error: 'Complaint not found.' });
      return;
    }

    const nextStatus = (body.status || existing.status).trim().toUpperCase();
    const nextPriority = (body.priority || existing.priority).trim().toUpperCase();
    const remarks = body.resolution_remarks !== undefined
      ? body.resolution_remarks.trim()
      : existing.resolution_remarks;

    if (!VALID_COMPLAINT_STATUSES.has(nextStatus)) {
      res.status(400).json({ error: 'Invalid complaint status.' });
      return;
    }
    if (!VALID_COMPLAINT_PRIORITIES.has(nextPriority)) {
      res.status(400).json({ error: 'Invalid complaint priority.' });
      return;
    }

    await withTransaction(async (tx) => {
      await tx.execute(
        'UPDATE complaints SET status = ?, priority = ?, resolution_remarks = ? WHERE complaint_id = ?',
        [nextStatus, nextPriority, remarks || null, id]
      );

      const tenant = await tx.queryOne<{ user_id: number }>(
        'SELECT user_id FROM tenants WHERE tenant_id = ?',
        [existing.tenant_id]
      );
      if (tenant) {
        await createNotification(
          tenant.user_id,
          `Complaint ${existing.complaint_code} is now ${nextStatus.replace('_', ' ')}${remarks ? `: ${remarks}` : '.'}`,
          tx
        );
      }

      await logAudit(
        {
          userId: req.user?.user_id || null,
          action: 'UPDATE_COMPLAINT',
          entityType: 'complaints',
          entityId: id,
          details: `${existing.complaint_code} updated to ${nextStatus} (${nextPriority})`,
        },
        tx
      );
    });

    res.json({ message: `Complaint ${existing.complaint_code} updated to ${nextStatus}.` });
  } catch (err) {
    console.error('updateComplaint error:', err);
    res.status(500).json({ error: 'Failed to update complaint.' });
  }
}
