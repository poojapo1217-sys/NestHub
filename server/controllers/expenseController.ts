import type { Response } from 'express';
import { db } from '../config/db.ts';
import type { AuthenticatedRequest } from '../middleware/auth.ts';
import { logAudit } from '../services/auditService.ts';
import { isNonEmptyString, toPositiveNumber } from '../validators/validators.ts';

export async function listExpenses(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const month = typeof req.query.month === 'string' ? req.query.month.trim() : '';
    const rows = await db.query<{
      expense_id: number;
      category: string;
      description: string;
      amount: number;
      expense_date: string;
    }>('SELECT expense_id, category, description, amount, expense_date FROM expenses ORDER BY expense_date DESC, expense_id DESC');

    const filtered = month
      ? rows.filter((r) => String(r.expense_date).startsWith(month))
      : rows;

    res.json({ expenses: filtered });
  } catch (err) {
    console.error('listExpenses error:', err);
    res.status(500).json({ error: 'Failed to load expenses.' });
  }
}

export async function createExpense(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { category, description, amount, expense_date } = req.body as {
      category?: string;
      description?: string;
      amount?: number;
      expense_date?: string;
    };

    const validAmount = toPositiveNumber(amount);
    if (!isNonEmptyString(category) || !isNonEmptyString(description) || validAmount === null) {
      res.status(400).json({ error: 'Category, description, and positive expense amount are required.' });
      return;
    }

    const expDate = expense_date?.trim() || new Date().toISOString().slice(0, 10);
    const ins = await db.execute(
      'INSERT INTO expenses (category, description, amount, expense_date) VALUES (?, ?, ?, ?)',
      [category.trim(), description.trim(), validAmount, expDate]
    );

    await logAudit({
      userId: req.user?.user_id || null,
      action: 'RECORD_EXPENSE',
      entityType: 'expenses',
      entityId: ins.insertId,
      details: `${category.trim()}: ₹${validAmount} (${description.trim()})`,
    });

    res.status(201).json({
      message: 'Operational expense recorded.',
      expense_id: ins.insertId,
    });
  } catch (err) {
    console.error('createExpense error:', err);
    res.status(500).json({ error: 'Failed to record expense.' });
  }
}
