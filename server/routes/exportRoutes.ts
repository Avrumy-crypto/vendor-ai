import { Router, Request, Response } from 'express';
import db from '../db';
import { requireAuth, requireRole } from '../auth';
import { logAudit, } from '../audit';
import { AuthRequest } from '../auth';

const router = Router();
router.use(requireAuth, requireRole('admin'));

router.get('/all', (req: Request, res: Response): void => {
  const actor = (req as AuthRequest).user;

  const departments = db.prepare('SELECT * FROM departments ORDER BY id').all();
  const users = db.prepare(
    'SELECT id, email, display_name, role, department_id, is_active, created_at, updated_at FROM users ORDER BY id'
  ).all();
  const knowledge = db.prepare('SELECT * FROM knowledge_entries ORDER BY id').all();
  const conversations = db.prepare('SELECT * FROM conversations ORDER BY id').all();
  const messages = db.prepare('SELECT * FROM messages ORDER BY id').all();
  const audit = db.prepare('SELECT * FROM audit_log ORDER BY id LIMIT 10000').all();
  const invites = db.prepare(
    'SELECT id, email, role, department_id, created_by, created_at, expires_at, used_at FROM invites ORDER BY id'
  ).all();

  logAudit(actor.id, 'export.all');

  const payload = {
    exported_at: new Date().toISOString(),
    exported_by: actor.display_name,
    version: '1.0',
    departments,
    users,
    knowledge_entries: knowledge,
    conversations,
    messages,
    invites,
    audit_log: audit,
  };

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="fivestar-workspace-export-${new Date().toISOString().slice(0, 10)}.json"`);
  res.json(payload);
});

export default router;
