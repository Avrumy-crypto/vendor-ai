import db from './db';

export function logAudit(
  userId: number | null,
  action: string,
  targetType: string | null = null,
  targetId: number | null = null,
  details: Record<string, unknown> = {}
): void {
  db.prepare(
    'INSERT INTO audit_log (user_id, action, target_type, target_id, details) VALUES (?, ?, ?, ?, ?)'
  ).run(userId, action, targetType, targetId, JSON.stringify(details));
}
