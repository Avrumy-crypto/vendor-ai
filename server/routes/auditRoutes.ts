import { Router, Request, Response } from 'express';
import db from '../db';
import { requireAuth, requireRole } from '../auth';
import { AuditEntry } from '../types';

const router = Router();
router.use(requireAuth, requireRole('admin'));

router.get('/', (req: Request, res: Response): void => {
  const { userId, action, page = '1', limit = '50' } = req.query as Record<string, string>;
  const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (userId) { conditions.push('a.user_id = ?'); params.push(parseInt(userId, 10)); }
  if (action) { conditions.push('a.action LIKE ?'); params.push(`${action}%`); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const entries = db.prepare(`
    SELECT a.*, u.display_name as user_name, u.email as user_email
    FROM audit_log a
    LEFT JOIN users u ON u.id = a.user_id
    ${where}
    ORDER BY a.created_at DESC
    LIMIT ? OFFSET ?
  `).all([...params, parseInt(limit, 10), offset]) as (AuditEntry & { user_name: string; user_email: string })[];

  const total = (db.prepare(`SELECT COUNT(*) as n FROM audit_log a ${where}`).get(...params) as { n: number }).n;

  res.json({ entries, total, page: parseInt(page, 10) });
});

export default router;
