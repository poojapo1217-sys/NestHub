import type { Response } from 'express';
import { db, withTransaction } from '../config/db.ts';
import type { AuthenticatedRequest } from '../middleware/auth.ts';
import { createNotification, logAudit } from '../services/auditService.ts';
import { currentBillingMonth, isValidBillingMonth, toNonNegativeNumber, toPositiveNumber } from '../validators/validators.ts';

export async function listRentPayments(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const month = typeof req.query.month === 'string' ? req.query.month.trim() : '';
    const status = typeof req.query.status === 'string' ? req.query.status.trim().toUpperCase() : '';
    const search = typeof req.query.search === 'string' ? req.query.search.trim().toLowerCase() : '';

    let sql = `
      SELECT rp.payment_id, rp.tenant_id, rp.amount, rp.electricity_share, rp.other_charges,
             (rp.amount + rp.electricity_share + rp.other_charges) as total_amount,
             rp.payment_month, rp.payment_date, rp.payment_status, rp.payment_method, rp.transaction_id,
             t.tenant_code, u.name as tenant_name, u.phone as tenant_phone, u.email as tenant_email,
             r.room_number, b.bed_number
      FROM rent_payments rp
      JOIN tenants t ON t.tenant_id = rp.tenant_id
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
      sql += ' WHERE rp.tenant_id = ?';
      params.push(req.user.tenant_id || -1);
    }

    sql += ' ORDER BY rp.payment_month DESC, rp.payment_id DESC';

    const rows = await db.query<Record<string, unknown>>(sql, params);

    const filtered = rows.filter((row) => {
      if (month && String(row.payment_month) !== month) return false;
      if (status && status !== 'ALL' && String(row.payment_status) !== status) return false;
      if (search) {
        const hay = `${row.tenant_name} ${row.tenant_code} ${row.transaction_id} ${row.room_number || ''}`.toLowerCase();
        if (!hay.includes(search)) return false;
      }
      return true;
    });

    res.json({ payments: filtered });
  } catch (err) {
    console.error('listRentPayments error:', err);
    res.status(500).json({ error: 'Failed to load rent payment records.' });
  }
}

export async function getRentPaymentById(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: 'Invalid payment ID.' });
      return;
    }

    const row = await db.queryOne<Record<string, unknown>>(
      `SELECT rp.*, (rp.amount + rp.electricity_share + rp.other_charges) as total_amount,
              t.tenant_code, u.name as tenant_name, u.email as tenant_email, u.phone as tenant_phone,
              r.room_number, b.bed_number
       FROM rent_payments rp
       JOIN tenants t ON t.tenant_id = rp.tenant_id
       JOIN users u ON u.user_id = t.user_id
       LEFT JOIN stay_history sh ON sh.stay_id = (
         SELECT sh2.stay_id FROM stay_history sh2 WHERE sh2.tenant_id = t.tenant_id
         ORDER BY (sh2.check_out IS NULL) DESC, sh2.stay_id DESC LIMIT 1
       )
       LEFT JOIN beds b ON b.bed_id = sh.bed_id
       LEFT JOIN rooms r ON r.room_id = b.room_id
       WHERE rp.payment_id = ?`,
      [id]
    );

    if (!row) {
      res.status(404).json({ error: 'Payment record not found.' });
      return;
    }

    if (req.user?.role === 'TENANT' && Number(row.tenant_id) !== req.user.tenant_id) {
      res.status(403).json({ error: 'Access denied. You may only view your own receipts.' });
      return;
    }

    res.json({ payment: row });
  } catch (err) {
    console.error('getRentPaymentById error:', err);
    res.status(500).json({ error: 'Failed to load payment receipt.' });
  }
}

export async function createOrProcessRentPayment(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const body = req.body as {
      action?: string;
      payment_id?: number;
      tenant_id?: number;
      payment_month?: string;
      amount?: number;
      electricity_share?: number;
      other_charges?: number;
      payment_method?: string;
      simulate_failure?: boolean;
    };

    // Action 1: Manager/Owner batch-generates monthly invoices for active tenants
    if (body.action === 'GENERATE_INVOICES') {
      if (req.user?.role === 'TENANT') {
        res.status(403).json({ error: 'Tenants cannot generate invoices.' });
        return;
      }
      const targetMonth = isValidBillingMonth(body.payment_month)
        ? body.payment_month!
        : currentBillingMonth();

      const generatedCount = await withTransaction(async (tx) => {
        const activeTenants = await tx.query<{
          tenant_id: number;
          user_id: number;
          monthly_rent: number;
          room_id: number | null;
        }>(
          `SELECT t.tenant_id, t.user_id, t.monthly_rent, b.room_id
           FROM tenants t
           LEFT JOIN stay_history sh ON sh.tenant_id = t.tenant_id AND sh.check_out IS NULL
           LEFT JOIN beds b ON b.bed_id = sh.bed_id
           WHERE t.status = 'ACTIVE'`
        );

        let count = 0;
        for (const t of activeTenants) {
          const existing = await tx.queryOne<{ payment_id: number }>(
            'SELECT payment_id FROM rent_payments WHERE tenant_id = ? AND payment_month = ?',
            [t.tenant_id, targetMonth]
          );
          if (existing) continue;

          let elecShare = 0;
          if (t.room_id) {
            const roomBill = await tx.queryOne<{ total_amount: number }>(
              'SELECT total_amount FROM electricity_bills WHERE room_id = ? AND billing_month = ?',
              [t.room_id, targetMonth]
            );
            if (roomBill) {
              const occCount = await tx.queryOne<{ cnt: number }>(
                `SELECT COUNT(*) as cnt FROM stay_history sh
                 JOIN beds b ON b.bed_id = sh.bed_id
                 WHERE b.room_id = ? AND sh.check_out IS NULL`,
                [t.room_id]
              );
              const divisor = Math.max(1, Number(occCount?.cnt || 1));
              elecShare = Number((Number(roomBill.total_amount) / divisor).toFixed(2));
            }
          }

          const txnId = `INV-${targetMonth.replace('-', '')}-${String(t.tenant_id).padStart(3, '0')}`;
          await tx.execute(
            `INSERT INTO rent_payments (tenant_id, amount, electricity_share, other_charges, payment_month, payment_date, payment_status, payment_method, transaction_id)
             VALUES (?, ?, ?, 0, ?, NULL, 'PENDING', 'Pending', ?)`,
            [t.tenant_id, t.monthly_rent, elecShare, targetMonth, txnId]
          );
          await createNotification(
            t.user_id,
            `Rent invoice for ${targetMonth} (₹ ${(Number(t.monthly_rent) + elecShare).toLocaleString('en-IN')}) has been generated.`,
            tx
          );
          count += 1;
        }
        await logAudit(
          {
            userId: req.user?.user_id || null,
            action: 'GENERATE_MONTHLY_INVOICES',
            entityType: 'rent_payments',
            entityId: targetMonth,
            details: `Generated ${count} pending rent invoices for ${targetMonth}`,
          },
          tx
        );
        return count;
      });

      res.status(201).json({
        message:
          generatedCount > 0
            ? `Generated ${generatedCount} rent invoices for ${targetMonth}.`
            : `All active tenants already have invoices for ${targetMonth}.`,
        generatedCount,
      });
      return;
    }

    // Action 2: Pay an existing pending invoice (Demo Payment Workflow or Manager Recording)
    if (body.payment_id) {
      const paymentId = Number(body.payment_id);
      const payment = await db.queryOne<{
        payment_id: number;
        tenant_id: number;
        amount: number;
        electricity_share: number;
        other_charges: number;
        payment_month: string;
        payment_status: string;
      }>('SELECT * FROM rent_payments WHERE payment_id = ?', [paymentId]);

      if (!payment) {
        res.status(404).json({ error: 'Invoice not found.' });
        return;
      }

      if (req.user?.role === 'TENANT' && payment.tenant_id !== req.user.tenant_id) {
        res.status(403).json({ error: 'Access denied. You can only pay your own bills.' });
        return;
      }

      if (payment.payment_status === 'PAID') {
        res.status(400).json({ error: 'This invoice has already been paid.' });
        return;
      }

      const method = (body.payment_method || 'UPI (Demo)').trim();
      const simulateFailure = Boolean(body.simulate_failure);
      const nowStr = new Date().toISOString().slice(0, 19).replace('T', ' ');
      const txnId = simulateFailure
        ? `FAIL-${Date.now().toString(36).toUpperCase()}`
        : `TXN-${payment.payment_month.replace('-', '')}-${String(payment.tenant_id).padStart(3, '0')}-${Date.now().toString().slice(-4)}`;

      await withTransaction(async (tx) => {
        if (simulateFailure) {
          await tx.execute(
            `UPDATE rent_payments
             SET payment_status = 'FAILED', payment_method = ?, transaction_id = ?, payment_date = ?
             WHERE payment_id = ?`,
            [method, txnId, nowStr, paymentId]
          );
        } else {
          await tx.execute(
            `UPDATE rent_payments
             SET payment_status = 'PAID', payment_method = ?, transaction_id = ?, payment_date = ?
             WHERE payment_id = ?`,
            [method, txnId, nowStr, paymentId]
          );
        }

        const tenantUser = await tx.queryOne<{ user_id: number }>(
          'SELECT user_id FROM tenants WHERE tenant_id = ?',
          [payment.tenant_id]
        );
        if (tenantUser) {
          const total = Number(payment.amount) + Number(payment.electricity_share) + Number(payment.other_charges);
          await createNotification(
            tenantUser.user_id,
            simulateFailure
              ? `Demo payment attempt (${txnId}) failed for ${payment.payment_month}. Please retry.`
              : `Demo payment confirmed (${txnId}) for ${payment.payment_month}: ₹ ${total.toLocaleString('en-IN')}.`,
            tx
          );
        }

        await logAudit(
          {
            userId: req.user?.user_id || null,
            action: simulateFailure ? 'DEMO_PAYMENT_FAILED' : 'RENT_PAYMENT_CONFIRMED',
            entityType: 'rent_payments',
            entityId: paymentId,
            details: `${simulateFailure ? 'Simulated failure' : 'Paid'} via ${method} (${txnId})`,
          },
          tx
        );
      });

      const updated = await db.queryOne<Record<string, unknown>>(
        `SELECT *, (amount + electricity_share + other_charges) as total_amount FROM rent_payments WHERE payment_id = ?`,
        [paymentId]
      );

      if (simulateFailure) {
        res.status(402).json({
          error: 'Simulated demo gateway decline. No real funds were charged.',
          payment: updated,
        });
        return;
      }

      res.json({
        message: 'Demo payment confirmed! Receipt is ready for download.',
        payment: updated,
      });
      return;
    }

    // Action 3: Manager/Owner directly records a manual rent payment
    if (req.user?.role === 'TENANT') {
      res.status(400).json({ error: 'Please select an invoice to pay.' });
      return;
    }

    const tenantId = Number(body.tenant_id);
    const amount = toPositiveNumber(body.amount);
    const electricityShare = toNonNegativeNumber(body.electricity_share ?? 0) ?? 0;
    const otherCharges = toNonNegativeNumber(body.other_charges ?? 0) ?? 0;
    const paymentMonth = body.payment_month || currentBillingMonth();
    const method = (body.payment_method || 'Cash').trim();

    if (!Number.isInteger(tenantId) || tenantId <= 0 || amount === null || !isValidBillingMonth(paymentMonth)) {
      res.status(400).json({ error: 'Valid tenant, positive rent amount, and billing month (YYYY-MM) are required.' });
      return;
    }

    const txnId = `TXN-${paymentMonth.replace('-', '')}-${String(tenantId).padStart(3, '0')}-${Date.now().toString().slice(-4)}`;
    const nowStr = new Date().toISOString().slice(0, 19).replace('T', ' ');

    const insertedId = await withTransaction(async (tx) => {
      const resInsert = await tx.execute(
        `INSERT INTO rent_payments (tenant_id, amount, electricity_share, other_charges, payment_month, payment_date, payment_status, payment_method, transaction_id)
         VALUES (?, ?, ?, ?, ?, ?, 'PAID', ?, ?)`,
        [tenantId, amount, electricityShare, otherCharges, paymentMonth, nowStr, method, txnId]
      );

      await logAudit(
        {
          userId: req.user?.user_id || null,
          action: 'RECORD_RENT_PAYMENT',
          entityType: 'rent_payments',
          entityId: resInsert.insertId,
          details: `Recorded payment ${txnId} of ₹${amount + electricityShare + otherCharges} for tenant #${tenantId}`,
        },
        tx
      );
      return resInsert.insertId;
    });

    res.status(201).json({
      message: `Rent payment recorded (${txnId}).`,
      payment_id: insertedId,
      transaction_id: txnId,
    });
  } catch (err) {
    console.error('createOrProcessRentPayment error:', err);
    res.status(500).json({ error: 'Failed to process rent payment.' });
  }
}
