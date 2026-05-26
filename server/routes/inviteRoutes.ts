import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import db from '../db';
import { requireAuth, requireRole, AuthRequest } from '../auth';
import { logAudit } from '../audit';
import { User } from '../types';

const router = Router();
router.use(requireAuth);

// List all invites (admin only)
router.get('/', requireRole('admin'), (_req: Request, res: Response): void => {
  const invites = db.prepare(`
    SELECT i.*, d.display_name as department_name, u.display_name as created_by_name,
           ub.display_name as used_by_name
    FROM invites i
    LEFT JOIN departments d ON d.id = i.department_id
    LEFT JOIN users u ON u.id = i.created_by
    LEFT JOIN users ub ON ub.id = i.used_by
    ORDER BY i.created_at DESC
  `).all();
  res.json(invites);
});

// Create invite (admin only)
router.post('/', requireRole('admin'), (req: Request, res: Response): void => {
  const actor = (req as AuthRequest).user;
  const { email, role, department_id } = req.body as {
    email?: string; role?: string; department_id?: number | null;
  };

  if (!role || !['employee', 'manager'].includes(role)) {
    res.status(400).json({ error: 'role must be employee or manager' });
    return;
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

  const result = db.prepare(
    "INSERT INTO invites (token, email, role, department_id, created_by, expires_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(token, email?.toLowerCase().trim() ?? null, role, department_id ?? null, actor.id, expiresAt);

  logAudit(actor.id, 'invite.create', 'invite', result.lastInsertRowid as number, { email, role });
  const invite = db.prepare('SELECT * FROM invites WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(invite);
});

// Revoke invite (admin only)
router.delete('/:id', requireRole('admin'), (req: Request, res: Response): void => {
  const actor = (req as AuthRequest).user;
  db.prepare('DELETE FROM invites WHERE id = ?').run(req.params.id);
  logAudit(actor.id, 'invite.revoke', 'invite', parseInt(req.params.id, 10));
  res.json({ ok: true });
});

// Validate invite token (public — called when user opens invite link)
router.get('/validate/:token', (req: Request, res: Response): void => {
  const invite = db.prepare(`
    SELECT i.*, d.display_name as department_name
    FROM invites i
    LEFT JOIN departments d ON d.id = i.department_id
    WHERE i.token = ? AND i.used_at IS NULL AND i.expires_at > datetime('now')
  `).get(req.params.token) as {
    id: number; email: string | null; role: string; department_name: string | null; expires_at: string;
  } | undefined;

  if (!invite) { res.status(404).json({ error: 'Invite not found or expired' }); return; }
  res.json({ email: invite.email, role: invite.role, department: invite.department_name, expires_at: invite.expires_at });
});

// Accept invite with email + password (creates account)
router.post('/accept/:token', (req: Request, res: Response): void => {
  const { email, password, display_name } = req.body as {
    email?: string; password?: string; display_name?: string;
  };

  if (!email || !password || !display_name) {
    res.status(400).json({ error: 'email, password, and display_name required' });
    return;
  }

  const invite = db.prepare(`
    SELECT * FROM invites WHERE token = ? AND used_at IS NULL AND expires_at > datetime('now')
  `).get(req.params.token) as {
    id: number; email: string | null; role: string; department_id: number | null;
  } | undefined;

  if (!invite) { res.status(404).json({ error: 'Invite not found or expired' }); return; }

  // If invite specifies an email, verify it matches
  if (invite.email && invite.email !== email.toLowerCase().trim()) {
    res.status(403).json({ error: 'This invite is for a different email address' });
    return;
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
  if (existing) { res.status(409).json({ error: 'An account with this email already exists' }); return; }

  const hash = bcrypt.hashSync(password, 12);
  const result = db.prepare(
    "INSERT INTO users (email, password_hash, display_name, role, department_id) VALUES (?, ?, ?, ?, ?)"
  ).run(email.toLowerCase().trim(), hash, display_name.trim(), invite.role, invite.department_id);

  db.prepare("UPDATE invites SET used_at = datetime('now'), used_by = ? WHERE id = ?")
    .run(result.lastInsertRowid, invite.id);

  const user = db.prepare(
    'SELECT id, email, display_name, role, department_id, is_active, created_at, updated_at FROM users WHERE id = ?'
  ).get(result.lastInsertRowid) as User;

  req.session.userId = user.id;
  logAudit(user.id, 'auth.register', 'invite', invite.id, { method: 'invite' });
  res.status(201).json({ user });
});

export default router;
