import type { Response } from 'express';
import { db } from '../config/db.ts';
import type { AuthenticatedRequest } from '../middleware/auth.ts';
import { logAudit } from '../services/auditService.ts';
import { isNonEmptyString, VALID_DAYS, VALID_MEAL_TYPES } from '../validators/validators.ts';

export async function listFoodMenu(_req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const items = await db.query<{
      menu_id: number;
      day: string;
      meal_type: string;
      food_items: string;
    }>(
      `SELECT menu_id, day, meal_type, food_items
       FROM food_menu
       ORDER BY
         CASE day
           WHEN 'Monday' THEN 1
           WHEN 'Tuesday' THEN 2
           WHEN 'Wednesday' THEN 3
           WHEN 'Thursday' THEN 4
           WHEN 'Friday' THEN 5
           WHEN 'Saturday' THEN 6
           WHEN 'Sunday' THEN 7
         END,
         CASE meal_type
           WHEN 'Breakfast' THEN 1
           WHEN 'Lunch' THEN 2
           WHEN 'Evening Snacks' THEN 3
           WHEN 'Dinner' THEN 4
         END`
    );
    res.json({ menu: items });
  } catch (err) {
    console.error('listFoodMenu error:', err);
    res.status(500).json({ error: 'Failed to load weekly food menu.' });
  }
}

export async function upsertFoodMenu(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { day, meal_type, food_items } = req.body as {
      day?: string;
      meal_type?: string;
      food_items?: string;
    };

    if (!day || !VALID_DAYS.has(day) || !meal_type || !VALID_MEAL_TYPES.has(meal_type) || !isNonEmptyString(food_items)) {
      res.status(400).json({ error: 'Valid day, meal type, and food items description are required.' });
      return;
    }

    const existing = await db.queryOne<{ menu_id: number }>(
      'SELECT menu_id FROM food_menu WHERE day = ? AND meal_type = ?',
      [day, meal_type]
    );

    if (existing) {
      await db.execute('UPDATE food_menu SET food_items = ? WHERE menu_id = ?', [
        food_items.trim(),
        existing.menu_id,
      ]);
      await logAudit({
        userId: req.user?.user_id || null,
        action: 'UPDATE_FOOD_MENU',
        entityType: 'food_menu',
        entityId: existing.menu_id,
        details: `Updated ${day} ${meal_type}: ${food_items.trim()}`,
      });
      res.json({ message: `${day} ${meal_type} updated.`, menu_id: existing.menu_id });
      return;
    }

    const ins = await db.execute(
      'INSERT INTO food_menu (day, meal_type, food_items) VALUES (?, ?, ?)',
      [day, meal_type, food_items.trim()]
    );
    res.status(201).json({ message: `${day} ${meal_type} added.`, menu_id: ins.insertId });
  } catch (err) {
    console.error('upsertFoodMenu error:', err);
    res.status(500).json({ error: 'Failed to save food menu item.' });
  }
}

export async function updateFoodMenuById(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id);
    const { food_items } = req.body as { food_items?: string };

    if (!Number.isInteger(id) || id <= 0 || !isNonEmptyString(food_items)) {
      res.status(400).json({ error: 'Valid menu ID and food items description are required.' });
      return;
    }

    const existing = await db.queryOne<{ menu_id: number; day: string; meal_type: string }>(
      'SELECT menu_id, day, meal_type FROM food_menu WHERE menu_id = ?',
      [id]
    );
    if (!existing) {
      res.status(404).json({ error: 'Menu slot not found.' });
      return;
    }

    await db.execute('UPDATE food_menu SET food_items = ? WHERE menu_id = ?', [food_items.trim(), id]);

    await logAudit({
      userId: req.user?.user_id || null,
      action: 'UPDATE_FOOD_MENU',
      entityType: 'food_menu',
      entityId: id,
      details: `Updated ${existing.day} ${existing.meal_type}: ${food_items.trim()}`,
    });

    res.json({ message: `${existing.day} ${existing.meal_type} menu updated.` });
  } catch (err) {
    console.error('updateFoodMenuById error:', err);
    res.status(500).json({ error: 'Failed to update food menu.' });
  }
}
