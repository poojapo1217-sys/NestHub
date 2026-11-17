import type { Response } from 'express';
import { db, withTransaction } from '../config/db.ts';
import type { AuthenticatedRequest } from '../middleware/auth.ts';
import { logAudit } from '../services/auditService.ts';
import { toNonNegativeNumber, toPositiveNumber } from '../validators/validators.ts';

export async function listDeposits(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    let sql = `
      SELECT d.deposit_id, d.tenant_id, d.amount, d.deposit_date, d.refund_amount, d.status,
             t.tenant_code, t.status as tenant_status, u.name as tenant_name, u.phone as tenant_phone,
             r.room_number, b.bed_number
      FROM deposits d
      JOIN tenants t ON t.tenant_id = d.tenant_id
      JOIN users u ON u.user_id = t.user_id
      LEFT JOIN stay_history sh ON sh.stay_id = (
        SELECT sh2.stay_id FROM stay_history sh2 WHERE sh2.tenant_id = t.tenant_id
        ORDER BY (sh2.check_out IS NULL) DESC, sh2.stay_id DESC LIMIT 1
      )
      LEFT JOIN beds b ON b.bed_id = sh.bed_id
      LEFT JOIN rooms r ON r.room_id = b.room_id
    `;
    const params: unknown[] = [];

    if (req.user?.role === 'TENANT') {
      sql += ' WHERE d.tenant_id = ?';
      params.push(req.user.tenant_id || -1);
    }

    sql += ' ORDER BY d.deposit_id DESC';
    const deposits = await db.query(sql, params);
    res.json({ deposits });
  } catch (err) {
    console.error('listDeposits error:', err);
    res.status(500).json({ error: 'Failed to load security deposits.' });
  }
}

export async function createOrRefundDeposit(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const body = req.body as {
      action?: string;
      deposit_id?: number;
      tenant_id?: number;
      amount?: number;
      deposit_date?: string;
      refund_amount?: number;
    };

    if (body.action === 'REFUND' && body.deposit_id) {
      const depositId = Number(body.deposit_id);
      const refundAmt = toNonNegativeNumber(body.refund_amount);
      if (refundAmt === null) {
        res.status(400).json({ error: 'Valid refund amount is required.' });
        return;
      }

      const existing = await db.queryOne<{ deposit_id: number; tenant_id: number; amount: number }>(
        'SELECT deposit_id, tenant_id, amount FROM deposits WHERE deposit_id = ?',
        [depositId]
      );
      if (!existing) {
        res.status(404).json({ error: 'Deposit record not found.' });
        return;
      }
      if (refundAmt > Number(existing.amount)) {
        res.status(400).json({ error: 'Refund amount cannot exceed original deposit amount.' });
        return;
      }

      const nextStatus =
        refundAmt === Number(existing.amount)
          ? 'REFUNDED'
          : refundAmt > 0
            ? 'PARTIAL_REFUND'
            : 'HELD';

      await withTransaction(async (tx) => {
        await tx.execute('UPDATE deposits SET refund_amount = ?, status = ? WHERE deposit_id = ?', [
          refundAmt,
          nextStatus,
          depositId,
        ]);
        await logAudit(
          {
            userId: req.user?.user_id || null,
            action: 'DEPOSIT_REFUND',
            entityType: 'deposits',
            entityId: depositId,
            details: `Processed deposit refund of ₹${refundAmt} (status: ${nextStatus})`,
          },
          tx
        );
      });

      res.json({ message: `Deposit refund updated (₹ ${refundAmt.toLocaleString('en-IN')}).`, status: nextStatus });
      return;
    }

    const tenantId = Number(body.tenant_id);
    const amount = toPositiveNumber(body.amount);
    const depositDate = body.deposit_date?.trim() || new Date().toISOString().slice(0, 10);

    if (!Number.isInteger(tenantId) || tenantId <= 0 || amount === null) {
      res.status(400).json({ error: 'Valid tenant and positive deposit amount are required.' });
      return;
    }

    const depositId = await withTransaction(async (tx) => {
      const ins = await tx.execute(
        `INSERT INTO deposits (tenant_id, amount, deposit_date, refund_amount, status)
         VALUES (?, ?, ?, 0, 'HELD')`,
        [tenantId, amount, depositDate]
      );
      await logAudit(
        {
          userId: req.user?.user_id || null,
          action: 'RECORD_DEPOSIT',
          entityType: 'deposits',
          entityId: ins.insertId,
          details: `Recorded security deposit ₹${amount} for tenant #${tenantId}`,
        },
        tx
      );
      return ins.insertId;
    });

    res.status(201).json({ message: 'Security deposit recorded.', deposit_id: depositId });
  } catch (err) {
    console.error('createOrRefundDeposit error:', err);
    res.status(500).json({ error: 'Failed to process security deposit.' });
  }
}
