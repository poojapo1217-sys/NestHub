import fs from 'node:fs';
import path from 'node:path';
import type { Response } from 'express';
import bcrypt from 'bcryptjs';
import { db, withTransaction } from '../config/db.ts';
import type { AuthenticatedRequest } from '../middleware/auth.ts';
import { createNotification, logAudit } from '../services/auditService.ts';
import {
  currentBillingMonth,
  isNonEmptyString,
  isValidEmail,
  isValidPhone,
  toNonNegativeNumber,
  toPositiveNumber,
} from '../validators/validators.ts';

export async function listTenants(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search.trim().toLowerCase() : '';
    const status = typeof req.query.status === 'string' ? req.query.status.trim().toUpperCase() : '';

    const rows = await db.query<Record<string, unknown>>(
      `SELECT t.tenant_id, t.tenant_code, t.user_id, t.joining_date, t.monthly_rent,
              t.emergency_contact, t.address, t.status,
              u.name, u.email, u.phone,
              sh.stay_id, sh.bed_id, sh.check_in, sh.check_out,
              b.bed_number, r.room_id, r.room_number, r.floor,
              (SELECT d.amount FROM deposits d WHERE d.tenant_id = t.tenant_id ORDER BY d.deposit_id DESC LIMIT 1) as deposit_amount,
              (SELECT d.status FROM deposits d WHERE d.tenant_id = t.tenant_id ORDER BY d.deposit_id DESC LIMIT 1) as deposit_status,
              (SELECT d.refund_amount FROM deposits d WHERE d.tenant_id = t.tenant_id ORDER BY d.deposit_id DESC LIMIT 1) as refund_amount
       FROM tenants t
       JOIN users u ON u.user_id = t.user_id
       LEFT JOIN stay_history sh ON sh.stay_id = (
         SELECT sh2.stay_id FROM stay_history sh2
         WHERE sh2.tenant_id = t.tenant_id
         ORDER BY (sh2.check_out IS NULL) DESC, sh2.stay_id DESC
         LIMIT 1
       )
       LEFT JOIN beds b ON b.bed_id = sh.bed_id
       LEFT JOIN rooms r ON r.room_id = b.room_id
       ORDER BY (t.status = 'ACTIVE') DESC, t.tenant_id DESC`
    );

    const filtered = rows.filter((row) => {
      if (status && status !== 'ALL' && String(row.status) !== status) return false;
      if (search) {
        const hay = `${row.name} ${row.email} ${row.phone} ${row.tenant_code} ${row.room_number || ''} ${row.bed_number || ''}`.toLowerCase();
        if (!hay.includes(search)) return false;
      }
      return true;
    });

    res.json({ tenants: filtered });
  } catch (err) {
    console.error('listTenants error:', err);
    res.status(500).json({ error: 'Failed to load tenants.' });
  }
}

export async function getTenantById(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: 'Invalid tenant ID.' });
      return;
    }

    if (req.user?.role === 'TENANT' && req.user.tenant_id !== id) {
      res.status(403).json({ error: 'Access denied. You can only view your own profile.' });
      return;
    }

    const tenant = await db.queryOne<Record<string, unknown>>(
      `SELECT t.tenant_id, t.tenant_code, t.user_id, t.joining_date, t.monthly_rent,
              t.emergency_contact, t.address, t.status,
              u.name, u.email, u.phone, u.created_at
       FROM tenants t
       JOIN users u ON u.user_id = t.user_id
       WHERE t.tenant_id = ?`,
      [id]
    );

    if (!tenant) {
      res.status(404).json({ error: 'Tenant not found.' });
      return;
    }

    const stays = await db.query(
      `SELECT sh.stay_id, sh.bed_id, sh.check_in, sh.check_out,
              b.bed_number, r.room_id, r.room_number, r.floor, r.room_type
       FROM stay_history sh
       JOIN beds b ON b.bed_id = sh.bed_id
       JOIN rooms r ON r.room_id = b.room_id
       WHERE sh.tenant_id = ?
       ORDER BY sh.stay_id DESC`,
      [id]
    );

    const payments = await db.query(
      `SELECT payment_id, amount, electricity_share, other_charges, payment_month,
              payment_date, payment_status, payment_method, transaction_id
       FROM rent_payments
       WHERE tenant_id = ?
       ORDER BY payment_month DESC, payment_id DESC`,
      [id]
    );

    const deposits = await db.query(
      `SELECT deposit_id, amount, deposit_date, refund_amount, status
       FROM deposits
       WHERE tenant_id = ?
       ORDER BY deposit_id DESC`,
      [id]
    );

    const documents = await db.query(
      `SELECT document_id, document_type, file_name, uploaded_date
       FROM documents
       WHERE tenant_id = ?
       ORDER BY document_id DESC`,
      [id]
    );

    res.json({ tenant, stays, payments, deposits, documents });
  } catch (err) {
    console.error('getTenantById error:', err);
    res.status(500).json({ error: 'Failed to load tenant details.' });
  }
}

export async function createTenant(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const body = req.body as Record<string, unknown>;
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
    const emergencyContact = typeof body.emergency_contact === 'string' ? body.emergency_contact.trim() : '';
    const address = typeof body.address === 'string' ? body.address.trim() : '';
    const joiningDate = typeof body.joining_date === 'string' && body.joining_date.trim()
      ? body.joining_date.trim()
      : new Date().toISOString().slice(0, 10);
    const bedId = Number(body.bed_id);
    const monthlyRent = toPositiveNumber(body.monthly_rent);
    const securityDeposit = toNonNegativeNumber(body.security_deposit ?? 0);
    const initialPassword =
      typeof body.password === 'string' && body.password.trim().length >= 6
        ? body.password.trim()
        : 'Tenant@123';
    const documentType =
      typeof body.document_type === 'string' && body.document_type.trim()
        ? body.document_type.trim()
        : 'Government ID';

    if (!isNonEmptyString(name)) {
      res.status(400).json({ error: 'Tenant full name is required.' });
      return;
    }
    if (!isValidEmail(email)) {
      res.status(400).json({ error: 'A valid email address is required.' });
      return;
    }
    if (!isValidPhone(phone)) {
      res.status(400).json({ error: 'A valid phone number is required.' });
      return;
    }
    if (!isValidPhone(emergencyContact)) {
      res.status(400).json({ error: 'A valid emergency contact number is required.' });
      return;
    }
    if (!Number.isInteger(bedId) || bedId <= 0) {
      res.status(400).json({ error: 'Please select a valid available bed.' });
      return;
    }
    if (monthlyRent === null) {
      res.status(400).json({ error: 'Monthly rent must be greater than zero.' });
      return;
    }
    if (securityDeposit === null) {
      res.status(400).json({ error: 'Security deposit cannot be negative.' });
      return;
    }

    const duplicateUser = await db.queryOne<{ user_id: number }>(
      'SELECT user_id FROM users WHERE email = ? OR phone = ?',
      [email, phone]
    );
    if (duplicateUser) {
      res.status(409).json({ error: 'A user with this email or phone number already exists.' });
      return;
    }

    const passwordHash = await bcrypt.hash(initialPassword, 10);

    const created = await withTransaction(async (tx) => {
      const bed = await tx.queryOne<{ bed_id: number; bed_number: string; room_id: number; status: string }>(
        'SELECT bed_id, bed_number, room_id, status FROM beds WHERE bed_id = ?',
        [bedId]
      );

      if (!bed) {
        throw { status: 404, message: 'Selected bed does not exist.' };
      }
      if (bed.status !== 'VACANT') {
        throw {
          status: 409,
          message: `Bed ${bed.bed_number} is currently ${bed.status} and cannot be assigned.`,
        };
      }

      const activeStay = await tx.queryOne<{ stay_id: number }>(
        'SELECT stay_id FROM stay_history WHERE bed_id = ? AND check_out IS NULL',
        [bedId]
      );
      if (activeStay) {
        throw {
          status: 409,
          message: `Bed ${bed.bed_number} already has an active occupant.`,
        };
      }

      const userInsert = await tx.execute(
        `INSERT INTO users (name, email, phone, password_hash, role, created_at)
         VALUES (?, ?, ?, ?, 'TENANT', ?)`,
        [name, email, phone, passwordHash, new Date().toISOString().slice(0, 19).replace('T', ' ')]
      );
      const userId = userInsert.insertId;

      const maxRow = await tx.queryOne<{ max_id: number }>('SELECT COALESCE(MAX(tenant_id), 0) as max_id FROM tenants');
      const nextNum = Number(maxRow?.max_id || 0) + 1;
      const tenantCode = `CS-T${String(nextNum).padStart(3, '0')}`;

      const tenantInsert = await tx.execute(
        `INSERT INTO tenants (tenant_code, user_id, joining_date, monthly_rent, emergency_contact, address, status)
         VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE')`,
        [tenantCode, userId, joiningDate, monthlyRent, emergencyContact, address]
      );
      const tenantId = tenantInsert.insertId;

      await tx.execute(
        'INSERT INTO stay_history (tenant_id, bed_id, check_in, check_out) VALUES (?, ?, ?, NULL)',
        [tenantId, bedId, joiningDate]
      );

      await tx.execute("UPDATE beds SET status = 'OCCUPIED' WHERE bed_id = ?", [bedId]);

      if (securityDeposit > 0) {
        await tx.execute(
          `INSERT INTO deposits (tenant_id, amount, deposit_date, refund_amount, status)
           VALUES (?, ?, ?, 0, 'HELD')`,
          [tenantId, securityDeposit, joiningDate]
        );
      }

      // Generate initial pending invoice for joining month
      const billingMonth = joiningDate.slice(0, 7) || currentBillingMonth();
      const txnId = `INV-${billingMonth.replace('-', '')}-${String(tenantId).padStart(3, '0')}-${Date.now().toString().slice(-4)}`;
      await tx.execute(
        `INSERT INTO rent_payments (tenant_id, amount, electricity_share, other_charges, payment_month, payment_date, payment_status, payment_method, transaction_id)
         VALUES (?, ?, 0, 0, ?, NULL, 'PENDING', 'Pending', ?)`,
        [tenantId, monthlyRent, billingMonth, txnId]
      );

      if (req.file) {
        await tx.execute(
          `INSERT INTO documents (tenant_id, document_type, file_name, file_path, uploaded_date)
           VALUES (?, ?, ?, ?, ?)`,
          [
            tenantId,
            documentType,
            req.file.originalname,
            req.file.filename,
            new Date().toISOString().slice(0, 19).replace('T', ' '),
          ]
        );
      }

      await createNotification(
        userId,
        `Welcome to Comfort Stay PG! Your bed ${bed.bed_number} is confirmed under ID ${tenantCode}.`,
        tx
      );

      await logAudit(
        {
          userId: req.user?.user_id || null,
          action: 'REGISTER_TENANT',
          entityType: 'tenants',
          entityId: tenantId,
          details: `Registered ${name} (${tenantCode}) to bed ${bed.bed_number}, deposit ₹${securityDeposit}`,
        },
        tx
      );

      return {
        tenant_id: tenantId,
        tenant_code: tenantCode,
        user_id: userId,
        bed_number: bed.bed_number,
        initial_password: initialPassword,
      };
    });

    res.status(201).json({
      message: `Tenant ${name} registered successfully and assigned to ${created.bed_number}.`,
      tenant: created,
    });
  } catch (err: unknown) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    if (err && typeof err === 'object' && 'status' in err && 'message' in err) {
      const e = err as { status: number; message: string };
      res.status(e.status).json({ error: e.message });
      return;
    }
    console.error('createTenant error:', err);
    res.status(500).json({ error: 'Failed to register tenant.' });
  }
}

export async function updateTenant(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: 'Invalid tenant ID.' });
      return;
    }

    const body = req.body as Record<string, unknown>;

    if (body.action === 'CHECKOUT') {
      const checkOutDate =
        typeof body.check_out_date === 'string' && body.check_out_date.trim()
          ? body.check_out_date.trim()
          : new Date().toISOString().slice(0, 10);
      const refundAmount = body.refund_amount !== undefined ? toNonNegativeNumber(body.refund_amount) : null;
      if (body.refund_amount !== undefined && refundAmount === null) {
        res.status(400).json({ error: 'Refund amount cannot be negative.' });
        return;
      }

      const result = await withTransaction(async (tx) => {
        const tenant = await tx.queryOne<{ tenant_id: number; user_id: number; tenant_code: string; status: string }>(
          'SELECT tenant_id, user_id, tenant_code, status FROM tenants WHERE tenant_id = ?',
          [id]
        );
        if (!tenant) {
          throw { status: 404, message: 'Tenant not found.' };
        }
        if (tenant.status === 'CHECKED_OUT') {
          throw { status: 400, message: 'Tenant is already checked out.' };
        }

        const activeStay = await tx.queryOne<{ stay_id: number; bed_id: number }>(
          'SELECT stay_id, bed_id FROM stay_history WHERE tenant_id = ? AND check_out IS NULL',
          [id]
        );

        await tx.execute("UPDATE tenants SET status = 'CHECKED_OUT' WHERE tenant_id = ?", [id]);

        if (activeStay) {
          await tx.execute('UPDATE stay_history SET check_out = ? WHERE stay_id = ?', [
            checkOutDate,
            activeStay.stay_id,
          ]);
          await tx.execute("UPDATE beds SET status = 'VACANT' WHERE bed_id = ?", [activeStay.bed_id]);
        }

        const deposit = await tx.queryOne<{ deposit_id: number; amount: number }>(
          "SELECT deposit_id, amount FROM deposits WHERE tenant_id = ? AND status = 'HELD' ORDER BY deposit_id DESC LIMIT 1",
          [id]
        );
        if (deposit && refundAmount !== null) {
          if (refundAmount > Number(deposit.amount)) {
            throw { status: 400, message: 'Refund amount cannot exceed security deposit held.' };
          }
          const newStatus =
            refundAmount === Number(deposit.amount)
              ? 'REFUNDED'
              : refundAmount > 0
                ? 'PARTIAL_REFUND'
                : 'HELD';
          await tx.execute('UPDATE deposits SET refund_amount = ?, status = ? WHERE deposit_id = ?', [
            refundAmount,
            newStatus,
            deposit.deposit_id,
          ]);
        }

        await logAudit(
          {
            userId: req.user?.user_id || null,
            action: 'TENANT_CHECKOUT',
            entityType: 'tenants',
            entityId: id,
            details: `Checked out ${tenant.tenant_code} on ${checkOutDate}${refundAmount !== null ? `, deposit refund ₹${refundAmount}` : ''}`,
          },
          tx
        );

        return { bedFreed: Boolean(activeStay), checkOutDate };
      });

      res.json({
        message: 'Tenant checked out successfully. Bed is now marked Vacant and payment history is preserved.',
        ...result,
      });
      return;
    }

    // Standard edit tenant details
    const existing = await db.queryOne<{ tenant_id: number; user_id: number }>(
      'SELECT tenant_id, user_id FROM tenants WHERE tenant_id = ?',
      [id]
    );
    if (!existing) {
      res.status(404).json({ error: 'Tenant not found.' });
      return;
    }

    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
    const emergencyContact = typeof body.emergency_contact === 'string' ? body.emergency_contact.trim() : '';
    const address = typeof body.address === 'string' ? body.address.trim() : '';
    const monthlyRent = toPositiveNumber(body.monthly_rent);

    if (!isNonEmptyString(name) || !isValidPhone(phone) || !isValidPhone(emergencyContact) || monthlyRent === null) {
      res.status(400).json({ error: 'Valid name, phone, emergency contact, and monthly rent are required.' });
      return;
    }

    await withTransaction(async (tx) => {
      await tx.execute('UPDATE users SET name = ?, phone = ? WHERE user_id = ?', [
        name,
        phone,
        existing.user_id,
      ]);
      await tx.execute(
        'UPDATE tenants SET monthly_rent = ?, emergency_contact = ?, address = ? WHERE tenant_id = ?',
        [monthlyRent, emergencyContact, address, id]
      );
      await logAudit(
        {
          userId: req.user?.user_id || null,
          action: 'UPDATE_TENANT',
          entityType: 'tenants',
          entityId: id,
          details: `Updated details for tenant #${id} (rent ₹${monthlyRent})`,
        },
        tx
      );
    });

    res.json({ message: 'Tenant details updated successfully.' });
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'status' in err && 'message' in err) {
      const e = err as { status: number; message: string };
      res.status(e.status).json({ error: e.message });
      return;
    }
    console.error('updateTenant error:', err);
    res.status(500).json({ error: 'Failed to update tenant.' });
  }
}

export async function downloadTenantDocument(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const tenantId = Number(req.params.id);
    const docId = Number(req.params.docId);

    if (req.user?.role === 'TENANT' && req.user.tenant_id !== tenantId) {
      res.status(403).json({ error: 'Access denied.' });
      return;
    }

    const doc = await db.queryOne<{ file_name: string; file_path: string }>(
      'SELECT file_name, file_path FROM documents WHERE document_id = ? AND tenant_id = ?',
      [docId, tenantId]
    );
    if (!doc) {
      res.status(404).json({ error: 'Document not found.' });
      return;
    }

    const fullPath = path.resolve(process.cwd(), 'uploads', path.basename(doc.file_path));
    if (!fs.existsSync(fullPath)) {
      res.status(404).json({ error: 'Stored document file is missing on server.' });
      return;
    }
    res.download(fullPath, doc.file_name);
  } catch (err) {
    console.error('downloadTenantDocument error:', err);
    res.status(500).json({ error: 'Failed to download document.' });
  }
}
