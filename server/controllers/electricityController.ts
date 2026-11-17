import type { Response } from 'express';
import { db, withTransaction } from '../config/db.ts';
import type { AuthenticatedRequest } from '../middleware/auth.ts';
import { logAudit } from '../services/auditService.ts';
import { isNonEmptyString, isValidBillingMonth, toNonNegativeNumber, toPositiveNumber } from '../validators/validators.ts';

export async function listElectricityBills(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const month = typeof req.query.month === 'string' ? req.query.month.trim() : '';
    const roomIdParam = req.query.room_id ? Number(req.query.room_id) : null;

    let sql = `
      SELECT eb.bill_id, eb.room_id, eb.previous_reading, eb.current_reading,
             eb.units_consumed, eb.rate_per_unit, eb.total_amount, eb.billing_month,
             eb.recorded_by, eb.created_at,
             r.room_number, r.floor, r.room_type,
             u.name as recorded_by_name,
             (SELECT COUNT(*) FROM stay_history sh
              JOIN beds b ON b.bed_id = sh.bed_id
              WHERE b.room_id = eb.room_id AND sh.check_out IS NULL) as active_occupants
      FROM electricity_bills eb
      JOIN rooms r ON r.room_id = eb.room_id
      LEFT JOIN users u ON u.user_id = eb.recorded_by
    `;
    const params: unknown[] = [];

    if (req.user?.role === 'TENANT') {
      const stay = await db.queryOne<{ room_id: number }>(
        `SELECT b.room_id
         FROM stay_history sh
         JOIN beds b ON b.bed_id = sh.bed_id
         WHERE sh.tenant_id = ? AND sh.check_out IS NULL`,
        [req.user.tenant_id || -1]
      );
      if (!stay) {
        res.json({ bills: [] });
        return;
      }
      sql += ' WHERE eb.room_id = ?';
      params.push(stay.room_id);
    }

    sql += ' ORDER BY eb.billing_month DESC, r.room_number ASC';

    const rows = await db.query<Record<string, unknown>>(sql, params);
    const filtered = rows.filter((r) => {
      if (month && String(r.billing_month) !== month) return false;
      if (roomIdParam && Number(r.room_id) !== roomIdParam) return false;
      return true;
    });

    res.json({ bills: filtered });
  } catch (err) {
    console.error('listElectricityBills error:', err);
    res.status(500).json({ error: 'Failed to load electricity bills.' });
  }
}

export async function getElectricityBillById(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id);
    const bill = await db.queryOne<Record<string, unknown>>(
      `SELECT eb.*, r.room_number, r.floor, r.room_type
       FROM electricity_bills eb
       JOIN rooms r ON r.room_id = eb.room_id
       WHERE eb.bill_id = ?`,
      [id]
    );
    if (!bill) {
      res.status(404).json({ error: 'Electricity bill not found.' });
      return;
    }

    if (req.user?.role === 'TENANT') {
      const stay = await db.queryOne<{ room_id: number }>(
        `SELECT b.room_id FROM stay_history sh
         JOIN beds b ON b.bed_id = sh.bed_id
         WHERE sh.tenant_id = ? AND sh.check_out IS NULL`,
        [req.user.tenant_id || -1]
      );
      if (!stay || stay.room_id !== Number(bill.room_id)) {
        res.status(403).json({ error: 'Access denied.' });
        return;
      }
    }

    res.json({ bill });
  } catch (err) {
    console.error('getElectricityBillById error:', err);
    res.status(500).json({ error: 'Failed to load electricity bill.' });
  }
}

export async function createElectricityBill(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const body = req.body as {
      room_id?: number;
      billing_month?: string;
      previous_reading?: number;
      current_reading?: number;
      rate_per_unit?: number;
    };

    const roomId = Number(body.room_id);
    const billingMonth = (body.billing_month || '').trim();
    const prevReading = toNonNegativeNumber(body.previous_reading);
    const currReading = toNonNegativeNumber(body.current_reading);
    const ratePerUnit = toPositiveNumber(body.rate_per_unit ?? 8);

    if (!Number.isInteger(roomId) || roomId <= 0) {
      res.status(400).json({ error: 'Please select a valid room.' });
      return;
    }
    if (!isValidBillingMonth(billingMonth)) {
      res.status(400).json({ error: 'Billing month must be in YYYY-MM format.' });
      return;
    }
    if (prevReading === null || currReading === null || ratePerUnit === null) {
      res.status(400).json({ error: 'Previous reading, current reading, and rate per unit must be valid numbers.' });
      return;
    }
    if (currReading < prevReading) {
      res.status(400).json({
        error: `Current reading (${currReading}) cannot be less than previous reading (${prevReading}).`,
      });
      return;
    }

    const room = await db.queryOne<{ room_id: number; room_number: string }>(
      'SELECT room_id, room_number FROM rooms WHERE room_id = ?',
      [roomId]
    );
    if (!room) {
      res.status(404).json({ error: 'Room not found.' });
      return;
    }

    const duplicate = await db.queryOne<{ bill_id: number }>(
      'SELECT bill_id FROM electricity_bills WHERE room_id = ? AND billing_month = ?',
      [roomId, billingMonth]
    );
    if (duplicate) {
      res.status(409).json({
        error: `Electricity bill for Room ${room.room_number} (${billingMonth}) already exists. Use authorized correction to edit.`,
      });
      return;
    }

    const unitsConsumed = currReading - prevReading;
    const totalAmount = Number((unitsConsumed * ratePerUnit).toFixed(2));

    const billId = await withTransaction(async (tx) => {
      const insertRes = await tx.execute(
        `INSERT INTO electricity_bills
         (room_id, previous_reading, current_reading, units_consumed, rate_per_unit, total_amount, billing_month, recorded_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          roomId,
          prevReading,
          currReading,
          unitsConsumed,
          ratePerUnit,
          totalAmount,
          billingMonth,
          req.user?.user_id || null,
          new Date().toISOString().slice(0, 19).replace('T', ' '),
        ]
      );

      // Update any pending rent invoices for active tenants in this room with their share
      const roomTenants = await tx.query<{ tenant_id: number }>(
        `SELECT t.tenant_id
         FROM tenants t
         JOIN stay_history sh ON sh.tenant_id = t.tenant_id AND sh.check_out IS NULL
         JOIN beds b ON b.bed_id = sh.bed_id
         WHERE b.room_id = ? AND t.status = 'ACTIVE'`,
        [roomId]
      );

      if (roomTenants.length > 0) {
        const share = Number((totalAmount / roomTenants.length).toFixed(2));
        for (const t of roomTenants) {
          await tx.execute(
            `UPDATE rent_payments
             SET electricity_share = ?
             WHERE tenant_id = ? AND payment_month = ? AND payment_status = 'PENDING'`,
            [share, t.tenant_id, billingMonth]
          );
        }
      }

      await logAudit(
        {
          userId: req.user?.user_id || null,
          action: 'RECORD_ELECTRICITY_BILL',
          entityType: 'electricity_bills',
          entityId: insertRes.insertId,
          details: `Room ${room.room_number} (${billingMonth}): ${prevReading} -> ${currReading} = ${unitsConsumed} units × ₹${ratePerUnit} = ₹${totalAmount}`,
        },
        tx
      );

      return insertRes.insertId;
    });

    res.status(201).json({
      message: `Electricity bill recorded for Room ${room.room_number}: ${unitsConsumed} units (₹ ${totalAmount.toLocaleString('en-IN')}).`,
      bill: {
        bill_id: billId,
        room_id: roomId,
        room_number: room.room_number,
        previous_reading: prevReading,
        current_reading: currReading,
        units_consumed: unitsConsumed,
        rate_per_unit: ratePerUnit,
        total_amount: totalAmount,
        billing_month: billingMonth,
      },
    });
  } catch (err) {
    console.error('createElectricityBill error:', err);
    res.status(500).json({ error: 'Failed to record electricity meter reading.' });
  }
}

export async function correctElectricityBill(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id);
    const body = req.body as {
      previous_reading?: number;
      current_reading?: number;
      rate_per_unit?: number;
      correction_reason?: string;
    };

    const existing = await db.queryOne<{
      bill_id: number;
      room_id: number;
      previous_reading: number;
      current_reading: number;
      rate_per_unit: number;
      billing_month: string;
    }>('SELECT * FROM electricity_bills WHERE bill_id = ?', [id]);

    if (!existing) {
      res.status(404).json({ error: 'Electricity bill not found.' });
      return;
    }

    const prevReading = toNonNegativeNumber(body.previous_reading ?? existing.previous_reading);
    const currReading = toNonNegativeNumber(body.current_reading ?? existing.current_reading);
    const ratePerUnit = toPositiveNumber(body.rate_per_unit ?? existing.rate_per_unit);
    const reason = body.correction_reason?.trim() || '';

    if (!isNonEmptyString(reason)) {
      res.status(400).json({ error: 'An audit reason is required for authorized meter reading corrections.' });
      return;
    }
    if (prevReading === null || currReading === null || ratePerUnit === null || currReading < prevReading) {
      res.status(400).json({ error: 'Invalid meter reading values. Current reading must be >= previous reading.' });
      return;
    }

    const unitsConsumed = currReading - prevReading;
    const totalAmount = Number((unitsConsumed * ratePerUnit).toFixed(2));

    await withTransaction(async (tx) => {
      await tx.execute(
        `UPDATE electricity_bills
         SET previous_reading = ?, current_reading = ?, units_consumed = ?, rate_per_unit = ?, total_amount = ?
         WHERE bill_id = ?`,
        [prevReading, currReading, unitsConsumed, ratePerUnit, totalAmount, id]
      );

      await logAudit(
        {
          userId: req.user?.user_id || null,
          action: 'CORRECT_ELECTRICITY_BILL',
          entityType: 'electricity_bills',
          entityId: id,
          details: `Authorized correction (${existing.billing_month}): ${existing.previous_reading}->${existing.current_reading} updated to ${prevReading}->${currReading} (₹${totalAmount}). Reason: ${reason}`,
        },
        tx
      );
    });

    res.json({
      message: 'Electricity reading corrected and recorded in audit log.',
      units_consumed: unitsConsumed,
      total_amount: totalAmount,
    });
  } catch (err) {
    console.error('correctElectricityBill error:', err);
    res.status(500).json({ error: 'Failed to correct electricity reading.' });
  }
}
