import type { Response } from 'express';
import { db } from '../config/db.ts';
import type { AuthenticatedRequest } from '../middleware/auth.ts';
import { logAudit } from '../services/auditService.ts';

export async function listBeds(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const roomFilter = typeof req.query.room === 'string' ? req.query.room.trim() : '';
    const statusFilter = typeof req.query.status === 'string' ? req.query.status.trim().toUpperCase() : '';

    const rooms = await db.query<{
      room_id: number;
      room_number: string;
      floor: number;
      room_type: string;
      total_beds: number;
    }>('SELECT room_id, room_number, floor, room_type, total_beds FROM rooms ORDER BY room_number ASC');

    const beds = await db.query<Record<string, unknown>>(
      `SELECT b.bed_id, b.room_id, b.bed_number, b.status,
              r.room_number, r.floor, r.room_type,
              t.tenant_id, t.tenant_code, t.monthly_rent, t.joining_date,
              u.name as tenant_name, u.phone as tenant_phone
       FROM beds b
       JOIN rooms r ON r.room_id = b.room_id
       LEFT JOIN stay_history sh ON sh.bed_id = b.bed_id AND sh.check_out IS NULL
       LEFT JOIN tenants t ON t.tenant_id = sh.tenant_id AND t.status = 'ACTIVE'
       LEFT JOIN users u ON u.user_id = t.user_id
       ORDER BY r.room_number ASC, b.bed_number ASC`
    );

    const totalBeds = beds.length;
    const occupiedBeds = beds.filter((b) => b.status === 'OCCUPIED').length;
    const vacantBeds = beds.filter((b) => b.status === 'VACANT').length;
    const maintenanceBeds = beds.filter((b) => b.status === 'MAINTENANCE').length;
    const occupancyPercentage = totalBeds > 0 ? Number(((occupiedBeds / totalBeds) * 100).toFixed(1)) : 0;

    const filteredBeds = beds.filter((b) => {
      if (roomFilter && !String(b.room_number).includes(roomFilter)) return false;
      if (statusFilter && statusFilter !== 'ALL' && String(b.status) !== statusFilter) return false;
      return true;
    });

    const groupedRooms = rooms
      .filter((r) => !roomFilter || r.room_number.includes(roomFilter))
      .map((room) => ({
        ...room,
        beds: filteredBeds.filter((b) => Number(b.room_id) === Number(room.room_id)),
      }))
      .filter((r) => !statusFilter || statusFilter === 'ALL' || r.beds.length > 0);

    res.json({
      summary: {
        totalRooms: rooms.length,
        totalBeds,
        occupiedBeds,
        vacantBeds,
        maintenanceBeds,
        occupancyPercentage,
      },
      rooms: groupedRooms,
      beds: filteredBeds,
    });
  } catch (err) {
    console.error('listBeds error:', err);
    res.status(500).json({ error: 'Failed to load bed inventory.' });
  }
}

export async function listVacantBeds(_req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const vacant = await db.query(
      `SELECT b.bed_id, b.room_id, b.bed_number, b.status,
              r.room_number, r.floor, r.room_type
       FROM beds b
       JOIN rooms r ON r.room_id = b.room_id
       WHERE b.status = 'VACANT'
       ORDER BY r.room_number ASC, b.bed_number ASC`
    );
    res.json({ vacant_beds: vacant });
  } catch (err) {
    console.error('listVacantBeds error:', err);
    res.status(500).json({ error: 'Failed to load vacant beds.' });
  }
}

export async function updateBedStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const bedId = Number(req.params.id);
    const { status } = req.body as { status?: string };
    const nextStatus = (status || '').trim().toUpperCase();

    if (!['VACANT', 'MAINTENANCE'].includes(nextStatus)) {
      res.status(400).json({ error: 'Bed status can only be toggled between VACANT and MAINTENANCE.' });
      return;
    }

    const bed = await db.queryOne<{ bed_id: number; bed_number: string; status: string }>(
      'SELECT bed_id, bed_number, status FROM beds WHERE bed_id = ?',
      [bedId]
    );
    if (!bed) {
      res.status(404).json({ error: 'Bed not found.' });
      return;
    }
    if (bed.status === 'OCCUPIED') {
      res.status(409).json({
        error: `Bed ${bed.bed_number} is currently occupied. Check out the resident before changing bed status.`,
      });
      return;
    }

    await db.execute('UPDATE beds SET status = ? WHERE bed_id = ?', [nextStatus, bedId]);

    await logAudit({
      userId: req.user?.user_id || null,
      action: 'UPDATE_BED_STATUS',
      entityType: 'beds',
      entityId: bedId,
      details: `Bed ${bed.bed_number} changed from ${bed.status} to ${nextStatus}`,
    });

    res.json({ message: `Bed ${bed.bed_number} marked as ${nextStatus}.` });
  } catch (err) {
    console.error('updateBedStatus error:', err);
    res.status(500).json({ error: 'Failed to update bed status.' });
  }
}
