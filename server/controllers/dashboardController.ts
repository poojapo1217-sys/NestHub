import type { Response } from 'express';
import { db } from '../config/db.ts';
import type { AuthenticatedRequest } from '../middleware/auth.ts';
import { currentBillingMonth } from '../validators/validators.ts';

function getTodayWeekday(): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[new Date().getDay()] || 'Monday';
}

export async function getTenantDashboard(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const tenantId = req.user?.tenant_id;
    if (!tenantId) {
      res.status(404).json({ error: 'Tenant profile not found for this account.' });
      return;
    }

    const profile = await db.queryOne<Record<string, unknown>>(
      `SELECT t.tenant_id, t.tenant_code, t.joining_date, t.monthly_rent, t.emergency_contact, t.address, t.status,
              u.name, u.email, u.phone,
              b.bed_id, b.bed_number, r.room_id, r.room_number, r.floor, r.room_type
       FROM tenants t
       JOIN users u ON u.user_id = t.user_id
       LEFT JOIN stay_history sh ON sh.stay_id = (
         SELECT sh2.stay_id FROM stay_history sh2 WHERE sh2.tenant_id = t.tenant_id
         ORDER BY (sh2.check_out IS NULL) DESC, sh2.stay_id DESC LIMIT 1
       )
       LEFT JOIN beds b ON b.bed_id = sh.bed_id
       LEFT JOIN rooms r ON r.room_id = b.room_id
       WHERE t.tenant_id = ?`,
      [tenantId]
    );

    const payments = await db.query<Record<string, unknown>>(
      `SELECT payment_id, amount, electricity_share, other_charges,
              (amount + electricity_share + other_charges) as total_amount,
              payment_month, payment_date, payment_status, payment_method, transaction_id
       FROM rent_payments
       WHERE tenant_id = ?
       ORDER BY payment_month DESC, payment_id DESC`,
      [tenantId]
    );

    const pendingAmount = payments
      .filter((p) => p.payment_status === 'PENDING')
      .reduce((acc, p) => acc + Number(p.total_amount || 0), 0);

    const lastPaid = payments.find((p) => p.payment_status === 'PAID') || null;
    const latestInvoice = payments[0] || null;

    let latestElectricity: Record<string, unknown> | null = null;
    if (profile?.room_id) {
      latestElectricity = await db.queryOne<Record<string, unknown>>(
        `SELECT eb.*, r.room_number
         FROM electricity_bills eb
         JOIN rooms r ON r.room_id = eb.room_id
         WHERE eb.room_id = ?
         ORDER BY eb.billing_month DESC, eb.bill_id DESC
         LIMIT 1`,
        [profile.room_id]
      );
    }

    const complaints = await db.query<Record<string, unknown>>(
      `SELECT complaint_id, complaint_code, category, title, complaint_date, status, priority
       FROM complaints
       WHERE tenant_id = ?
       ORDER BY complaint_id DESC
       LIMIT 5`,
      [tenantId]
    );

    const complaintSummary = {
      pending: complaints.filter((c) => c.status === 'PENDING').length,
      inProgress: complaints.filter((c) => c.status === 'IN_PROGRESS').length,
      resolved: complaints.filter((c) => c.status === 'RESOLVED').length,
      total: complaints.length,
    };

    const todayDay = getTodayWeekday();
    const todayMenu = await db.query(
      `SELECT menu_id, day, meal_type, food_items
       FROM food_menu
       WHERE day = ?
       ORDER BY CASE meal_type
         WHEN 'Breakfast' THEN 1
         WHEN 'Lunch' THEN 2
         WHEN 'Evening Snacks' THEN 3
         WHEN 'Dinner' THEN 4
       END`,
      [todayDay]
    );

    const notifications = await db.query(
      `SELECT notification_id, message, status, created_at
       FROM notifications
       WHERE user_id = ?
       ORDER BY notification_id DESC
       LIMIT 8`,
      [req.user!.user_id]
    );

    const deposit = await db.queryOne(
      'SELECT deposit_id, amount, deposit_date, refund_amount, status FROM deposits WHERE tenant_id = ? ORDER BY deposit_id DESC LIMIT 1',
      [tenantId]
    );

    res.json({
      profile,
      pendingAmount,
      lastPayment: lastPaid,
      latestInvoice,
      latestElectricity,
      complaintSummary,
      recentComplaints: complaints,
      todayDay,
      todayMenu,
      notifications,
      deposit,
    });
  } catch (err) {
    console.error('getTenantDashboard error:', err);
    res.status(500).json({ error: 'Failed to load tenant dashboard.' });
  }
}

export async function getManagerDashboard(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const tenantCount = await db.queryOne<{ cnt: number }>(
      "SELECT COUNT(*) as cnt FROM tenants WHERE status = 'ACTIVE'"
    );
    const roomCount = await db.queryOne<{ cnt: number }>('SELECT COUNT(*) as cnt FROM rooms');
    const beds = await db.query<{ status: string }>('SELECT status FROM beds');
    const totalBeds = beds.length;
    const occupiedBeds = beds.filter((b) => b.status === 'OCCUPIED').length;
    const vacantBeds = beds.filter((b) => b.status === 'VACANT').length;
    const maintenanceBeds = beds.filter((b) => b.status === 'MAINTENANCE').length;

    const pendingComplaints = await db.queryOne<{ cnt: number }>(
      "SELECT COUNT(*) as cnt FROM complaints WHERE status IN ('PENDING', 'IN_PROGRESS')"
    );

    const recentReadings = await db.query(
      `SELECT eb.bill_id, eb.room_id, eb.previous_reading, eb.current_reading, eb.units_consumed,
              eb.rate_per_unit, eb.total_amount, eb.billing_month, eb.created_at,
              r.room_number
       FROM electricity_bills eb
       JOIN rooms r ON r.room_id = eb.room_id
       ORDER BY eb.billing_month DESC, r.room_number ASC
       LIMIT 15`
    );

    const recentComplaints = await db.query(
      `SELECT c.complaint_id, c.complaint_code, c.category, c.title, c.complaint_date, c.status, c.priority,
              u.name as tenant_name, r.room_number
       FROM complaints c
       JOIN tenants t ON t.tenant_id = c.tenant_id
       JOIN users u ON u.user_id = t.user_id
       LEFT JOIN rooms r ON r.room_id = c.room_id
       ORDER BY c.complaint_id DESC
       LIMIT 5`
    );

    const notifications = await db.query(
      'SELECT notification_id, message, status, created_at FROM notifications WHERE user_id = ? ORDER BY notification_id DESC LIMIT 6',
      [req.user!.user_id]
    );

    res.json({
      stats: {
        totalTenants: Number(tenantCount?.cnt || 0),
        totalRooms: Number(roomCount?.cnt || 0),
        totalBeds,
        occupiedBeds,
        vacantBeds,
        maintenanceBeds,
        occupancyPercentage: totalBeds > 0 ? Number(((occupiedBeds / totalBeds) * 100).toFixed(1)) : 0,
        pendingComplaints: Number(pendingComplaints?.cnt || 0),
      },
      recentReadings,
      recentComplaints,
      notifications,
    });
  } catch (err) {
    console.error('getManagerDashboard error:', err);
    res.status(500).json({ error: 'Failed to load manager dashboard.' });
  }
}

export async function getOwnerDashboard(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const selectedMonth =
      typeof req.query.month === 'string' && /^\d{4}-\d{2}$/.test(req.query.month.trim())
        ? req.query.month.trim()
        : currentBillingMonth();

    const allPayments = await db.query<{
      payment_id: number;
      tenant_id: number;
      amount: number;
      electricity_share: number;
      other_charges: number;
      payment_month: string;
      payment_date: string | null;
      payment_status: string;
      payment_method: string;
      transaction_id: string;
      tenant_code: string;
      tenant_name: string;
      room_number: string | null;
    }>(
      `SELECT rp.*, t.tenant_code, u.name as tenant_name, r.room_number
       FROM rent_payments rp
       JOIN tenants t ON t.tenant_id = rp.tenant_id
       JOIN users u ON u.user_id = t.user_id
       LEFT JOIN stay_history sh ON sh.stay_id = (
         SELECT sh2.stay_id FROM stay_history sh2 WHERE sh2.tenant_id = t.tenant_id
         ORDER BY (sh2.check_out IS NULL) DESC, sh2.stay_id DESC LIMIT 1
       )
       LEFT JOIN beds b ON b.bed_id = sh.bed_id
       LEFT JOIN rooms r ON r.room_id = b.room_id
       ORDER BY rp.payment_month DESC, rp.payment_id DESC`
    );

    const monthPayments = allPayments.filter((p) => p.payment_month === selectedMonth);

    const monthlyRentCollected = monthPayments
      .filter((p) => p.payment_status === 'PAID')
      .reduce((acc, p) => acc + Number(p.amount), 0);

    const electricityCollectedFromPayments = monthPayments
      .filter((p) => p.payment_status === 'PAID')
      .reduce((acc, p) => acc + Number(p.electricity_share || 0), 0);

    const otherCollected = monthPayments
      .filter((p) => p.payment_status === 'PAID')
      .reduce((acc, p) => acc + Number(p.other_charges || 0), 0);

    const totalRentDue = monthPayments.reduce(
      (acc, p) => acc + Number(p.amount) + Number(p.electricity_share || 0) + Number(p.other_charges || 0),
      0
    );
    const totalPaidForMonth = monthPayments
      .filter((p) => p.payment_status === 'PAID')
      .reduce(
        (acc, p) => acc + Number(p.amount) + Number(p.electricity_share || 0) + Number(p.other_charges || 0),
        0
      );
    const pendingRent = Math.max(0, Number((totalRentDue - totalPaidForMonth).toFixed(2)));

    const elecBills = await db.query<{ billing_month: string; total_amount: number }>(
      'SELECT billing_month, total_amount FROM electricity_bills WHERE billing_month = ?',
      [selectedMonth]
    );
    const electricityBilled = elecBills.reduce((acc, b) => acc + Number(b.total_amount), 0);

    const deposits = await db.query<Record<string, unknown>>(
      `SELECT d.deposit_id, d.tenant_id, d.amount, d.deposit_date, d.refund_amount, d.status,
              t.tenant_code, u.name as tenant_name, r.room_number
       FROM deposits d
       JOIN tenants t ON t.tenant_id = d.tenant_id
       JOIN users u ON u.user_id = t.user_id
       LEFT JOIN stay_history sh ON sh.stay_id = (
         SELECT sh2.stay_id FROM stay_history sh2 WHERE sh2.tenant_id = t.tenant_id
         ORDER BY (sh2.check_out IS NULL) DESC, sh2.stay_id DESC LIMIT 1
       )
       LEFT JOIN beds b ON b.bed_id = sh.bed_id
       LEFT JOIN rooms r ON r.room_id = b.room_id
       ORDER BY d.deposit_id DESC`
    );
    const totalSecurityDeposits = deposits.reduce(
      (acc, d) => acc + (Number(d.amount || 0) - Number(d.refund_amount || 0)),
      0
    );

    const allExpenses = await db.query<{ expense_id: number; category: string; description: string; amount: number; expense_date: string }>(
      'SELECT * FROM expenses ORDER BY expense_date DESC'
    );
    const monthExpenses = allExpenses.filter((e) => String(e.expense_date).startsWith(selectedMonth));
    const totalExpenses = monthExpenses.reduce((acc, e) => acc + Number(e.amount), 0);

    // Avoid double counting: Total Income for the month = Rent Collected + Electricity Share Collected + Other Charges Collected
    const totalIncome = Number((monthlyRentCollected + electricityCollectedFromPayments + otherCollected).toFixed(2));
    const netIncome = Number((totalIncome - totalExpenses).toFixed(2));

    // Build monthly series from actual payment & expense records across available months
    const monthSet = new Set<string>([selectedMonth]);
    allPayments.forEach((p) => monthSet.add(p.payment_month));
    allExpenses.forEach((e) => monthSet.add(String(e.expense_date).slice(0, 7)));
    const sortedMonths = Array.from(monthSet).sort();

    const monthlySeries = sortedMonths.map((m) => {
      const mPay = allPayments.filter((p) => p.payment_month === m);
      const rentPaid = mPay
        .filter((p) => p.payment_status === 'PAID')
        .reduce((acc, p) => acc + Number(p.amount), 0);
      const elecPaid = mPay
        .filter((p) => p.payment_status === 'PAID')
        .reduce((acc, p) => acc + Number(p.electricity_share || 0), 0);
      const pending = mPay
        .filter((p) => p.payment_status !== 'PAID')
        .reduce((acc, p) => acc + Number(p.amount) + Number(p.electricity_share || 0), 0);
      const exp = allExpenses
        .filter((e) => String(e.expense_date).startsWith(m))
        .reduce((acc, e) => acc + Number(e.amount), 0);
      const revenue = rentPaid + elecPaid;
      return {
        month: m,
        rentCollected: rentPaid,
        electricityCollected: elecPaid,
        pendingRent: pending,
        totalRevenue: revenue,
        expenses: exp,
        netIncome: revenue - exp,
      };
    });

    const paymentStatusBreakdown = [
      {
        name: 'Paid',
        value: monthPayments.filter((p) => p.payment_status === 'PAID').length,
        amount: totalPaidForMonth,
      },
      {
        name: 'Pending',
        value: monthPayments.filter((p) => p.payment_status === 'PENDING').length,
        amount: pendingRent,
      },
      {
        name: 'Failed',
        value: monthPayments.filter((p) => p.payment_status === 'FAILED').length,
        amount: monthPayments
          .filter((p) => p.payment_status === 'FAILED')
          .reduce((acc, p) => acc + Number(p.amount) + Number(p.electricity_share || 0), 0),
      },
    ].filter((item) => item.value > 0);

    const roomOccupancy = await db.query<{
      room_number: string;
      occupied: number;
      vacant: number;
      maintenance: number;
    }>(
      `SELECT r.room_number,
              SUM(CASE WHEN b.status = 'OCCUPIED' THEN 1 ELSE 0 END) as occupied,
              SUM(CASE WHEN b.status = 'VACANT' THEN 1 ELSE 0 END) as vacant,
              SUM(CASE WHEN b.status = 'MAINTENANCE' THEN 1 ELSE 0 END) as maintenance
       FROM rooms r
       JOIN beds b ON b.room_id = r.room_id
       GROUP BY r.room_id, r.room_number
       ORDER BY r.room_number ASC`
    );

    const recentTransactions = allPayments.slice(0, 12).map((p) => ({
      ...p,
      total_amount: Number(p.amount) + Number(p.electricity_share || 0) + Number(p.other_charges || 0),
    }));

    const pendingRentList = monthPayments
      .filter((p) => p.payment_status !== 'PAID')
      .map((p) => ({
        ...p,
        total_amount: Number(p.amount) + Number(p.electricity_share || 0) + Number(p.other_charges || 0),
      }));

    res.json({
      selectedMonth,
      availableMonths: sortedMonths,
      kpis: {
        monthlyRentCollected,
        pendingRent,
        totalSecurityDeposits,
        electricityCollections: electricityCollectedFromPayments,
        electricityBilled,
        totalIncome,
        totalExpenses,
        netIncome,
      },
      charts: {
        monthlySeries,
        paymentStatusBreakdown,
        roomOccupancy,
      },
      tables: {
        recentTransactions,
        pendingRentList,
        deposits,
        expenses: monthExpenses,
      },
    });
  } catch (err) {
    console.error('getOwnerDashboard error:', err);
    res.status(500).json({ error: 'Failed to load financial analytics.' });
  }
}

export async function markNotificationsRead(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    await db.execute("UPDATE notifications SET status = 'READ' WHERE user_id = ?", [req.user!.user_id]);
    res.json({ message: 'Notifications marked as read.' });
  } catch (err) {
    console.error('markNotificationsRead error:', err);
    res.status(500).json({ error: 'Failed to update notifications.' });
  }
}
