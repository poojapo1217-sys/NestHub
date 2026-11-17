import { db, type DbExecutor } from '../config/db.ts';

export async function logAudit(
  params: {
    userId: number | null;
    action: string;
    entityType: string;
    entityId: string | number;
    details?: string;
  },
  executor: DbExecutor = db
): Promise<void> {
  await executor.execute(
    `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      params.userId,
      params.action,
      params.entityType,
      String(params.entityId),
      params.details || null,
      new Date().toISOString().slice(0, 19).replace('T', ' '),
    ]
  );
}

export async function createNotification(
  userId: number,
  message: string,
  executor: DbExecutor = db
): Promise<void> {
  await executor.execute(
    `INSERT INTO notifications (user_id, message, status, created_at)
     VALUES (?, ?, 'UNREAD', ?)`,
    [userId, message, new Date().toISOString().slice(0, 19).replace('T', ' ')]
  );
}
