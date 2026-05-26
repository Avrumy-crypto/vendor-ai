import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import db from '../db';
import { requireAuth, AuthRequest } from '../auth';
import { logAudit } from '../audit';
import { User } from '../types';

const router = Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

function safeUser(row: User) {
  return {
    id: row.id,
    email: row.email,
    display_name: row.display_name,
    role: row.role,
    department_id: row.department_id,
    is_active: row.is_active,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

router.post('/login', (req: Request, res: Response): void => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password required' });
    return;
  }

  const row = db.prepare(
    'SELECT id, email, display_name, role, department_id, is_active, password_hash, created_at, updated_at FROM users WHERE email = ?'
  ).get(email.toLowerCase().trim()) as (User & { password_hash: string | null }) | undefined;

  if (!row || !row.is_active || !row.password_hash || !bcrypt.compareSync(password, row.password_hash)) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  req.session.userId = row.id;
  logAudit(row.id, 'auth.login', null, null, { method: 'password' });
  res.json({ user: safeUser(row) });
});

// Google Sign-In: receives a credential JWT from the Google Identity Services button
router.post('/google', async (req: Request, res: Response): Promise<void> => {
  const { credential } = req.body as { credential?: string };
  if (!credential) { res.status(400).json({ error: 'Credential required' }); return; }
  if (!process.env.GOOGLE_CLIENT_ID) { res.status(501).json({ error: 'Google login not configured' }); return; }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload?.email) { res.status(400).json({ error: 'No email in Google token' }); return; }

    const googleId = payload.sub;
    const email = payload.email.toLowerCase();
    const name = payload.name ?? email.split('@')[0];
    const avatar = payload.picture;

    // Find by google_id first, then by email
    let user = db.prepare(
      'SELECT id, email, display_name, role, department_id, is_active, created_at, updated_at FROM users WHERE google_id = ?'
    ).get(googleId) as User | undefined;

    if (!user) {
      user = db.prepare(
        'SELECT id, email, display_name, role, department_id, is_active, created_at, updated_at FROM users WHERE email = ?'
      ).get(email) as User | undefined;

      if (user) {
        // Link Google account to existing email user
        db.prepare("UPDATE users SET google_id = ?, google_avatar = ?, updated_at = datetime('now') WHERE id = ?")
          .run(googleId, avatar ?? null, user.id);
      }
    }

    // Check for a pending invite matching this email
    if (!user) {
      const invite = db.prepare(
        "SELECT * FROM invites WHERE email = ? AND used_at IS NULL AND expires_at > datetime('now')"
      ).get(email) as { id: number; role: string; department_id: number | null } | undefined;

      const role = invite?.role ?? 'employee';
      const deptId = invite?.department_id ?? null;

      const result = db.prepare(
        "INSERT INTO users (email, display_name, role, department_id, google_id, google_avatar) VALUES (?, ?, ?, ?, ?, ?)"
      ).run(email, name, role, deptId, googleId, avatar ?? null);

      if (invite) {
        db.prepare("UPDATE invites SET used_at = datetime('now'), used_by = ? WHERE id = ?")
          .run(result.lastInsertRowid, invite.id);
      }

      user = db.prepare(
        'SELECT id, email, display_name, role, department_id, is_active, created_at, updated_at FROM users WHERE id = ?'
      ).get(result.lastInsertRowid) as User;
    }

    if (!user.is_active) { res.status(403).json({ error: 'Account is deactivated' }); return; }

    req.session.userId = user.id;
    logAudit(user.id, 'auth.login', null, null, { method: 'google' });
    res.json({ user: safeUser(user) });
  } catch (err) {
    console.error('Google auth error:', err);
    res.status(401).json({ error: 'Google sign-in failed' });
  }
});

router.post('/logout', requireAuth, (req: Request, res: Response): void => {
  const user = (req as AuthRequest).user;
  logAudit(user.id, 'auth.logout');
  req.session.destroy(() => { res.json({ ok: true }); });
});

router.get('/me', requireAuth, (req: Request, res: Response): void => {
  const user = (req as AuthRequest).user;
  const dept = user.department_id
    ? db.prepare('SELECT id, name, display_name FROM departments WHERE id = ?').get(user.department_id) as { id: number; name: string; display_name: string } | undefined
    : null;
  res.json({ user: { ...safeUser(user), department: dept ?? null } });
});

export default router;
