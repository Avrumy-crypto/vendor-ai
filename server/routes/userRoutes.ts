import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import db from '../db';
import { requireAuth, requireRole, AuthRequest } from '../auth';
import { logAudit } from '../audit';
import { User } from '../types';

const router = Router();
router.use(requireAuth, requireRole('admin'));

router.get('/', (_req: Request, res: Response): void => {
  const users = db.prepare(`
    SELECT u.id, u.email, u.display_name, u.role, u.department_id, u.is_active, u.created_at,
           d.display_name as department_display_name
    FROM users u
    LEFT JOIN departments d ON d.id = u.department_id
    ORDER BY u.display_name ASC
  `).all() as (User & { department_display_name: string | null })[];
  res.json(users);
});

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const actor = (req as AuthRequest).user;
  const { email, password, display_name, role, department_id } = req.body as {
    email?: string; password?: string; display_name?: string; role?: string; department_id?: number | null;
  };

  if (!email || !password || !display_name || !role) {
    res.status(400).json({ error: 'email, password, display_name, role required' });
    return;
  }
  if (!['employee', 'manager', 'admin'].includes(role)) {
    res.status(400).json({ error: 'Invalid role' });
    return;
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
  if (existing) { res.status(409).json({ error: 'Email already in use' }); return; }

  const hash = bcrypt.hashSync(password, 12);
  const result = db.prepare(
    'INSERT INTO users (email, password_hash, display_name, role, department_id) VALUES (?, ?, ?, ?, ?)'
  ).run(email.toLowerCase().trim(), hash, display_name.trim(), role, department_id ?? null);

  logAudit(actor.id, 'user.create', 'user', result.lastInsertRowid as number, { email, role });
  const created = db.prepare('SELECT id, email, display_name, role, department_id, is_active, created_at FROM users WHERE id = ?').get(result.lastInsertRowid) as User;
  res.status(201).json(created);
});

router.put('/:id', (req: Request, res: Response): void => {
  const actor = (req as AuthRequest).user;
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id) as { id: number } | undefined;
  if (!user) { res.status(404).json({ error: 'User not found' }); return; }

  const { role, department_id, is_active, display_name, password } = req.body as {
    role?: string; department_id?: number | null; is_active?: number; display_name?: string; password?: string;
  };

  if (role && !['employee', 'manager', 'admin'].includes(role)) {
    res.status(400).json({ error: 'Invalid role' }); return;
  }

  const hash = password ? bcrypt.hashSync(password, 12) : null;

  db.prepare(`
    UPDATE users SET
      role = COALESCE(?, role),
      department_id = CASE WHEN ? IS NOT NULL THEN ? ELSE department_id END,
      is_active = COALESCE(?, is_active),
      display_name = COALESCE(?, display_name),
      password_hash = COALESCE(?, password_hash),
      updated_at = datetime('now')
    WHERE id = ?
  `).run(role ?? null, department_id !== undefined ? 1 : null, department_id ?? null, is_active ?? null, display_name ?? null, hash, user.id);

  logAudit(actor.id, 'user.update', 'user', user.id, { role, is_active });
  const updated = db.prepare('SELECT id, email, display_name, role, department_id, is_active, created_at FROM users WHERE id = ?').get(user.id) as User;
  res.json(updated);
});

export default router;
