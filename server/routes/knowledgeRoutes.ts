import { Router, Request, Response } from 'express';
import db from '../db';
import { requireAuth, requireRole, AuthRequest } from '../auth';
import { logAudit } from '../audit';
import { KnowledgeEntry } from '../types';

const router = Router();
router.use(requireAuth);

// List entries — filtered by permission
router.get('/', (req: Request, res: Response): void => {
  const user = (req as AuthRequest).user;
  const { layer, status } = req.query as { layer?: string; status?: string };

  let sql = `
    SELECT ke.*, d.display_name as department_display_name,
           u.display_name as created_by_name
    FROM knowledge_entries ke
    LEFT JOIN departments d ON d.id = ke.department_id
    LEFT JOIN users u ON u.id = ke.created_by
    WHERE `;

  const params: unknown[] = [];
  const conditions: string[] = [];

  if (user.role === 'admin') {
    // Admin sees everything
  } else if (user.role === 'manager') {
    conditions.push(`(
      (ke.layer = 'company' AND ke.status = 'active')
      OR (ke.layer = 'department' AND ke.department_id = ? AND ke.status IN ('draft','active'))
      OR (ke.layer = 'personal' AND ke.owner_user_id = ?)
    )`);
    params.push(user.department_id, user.id);
  } else {
    conditions.push(`(
      (ke.layer = 'company' AND ke.status = 'active')
      OR (ke.layer = 'department' AND ke.department_id = ? AND ke.status = 'active')
      OR (ke.layer = 'personal' AND ke.owner_user_id = ?)
    )`);
    params.push(user.department_id, user.id);
  }

  if (layer) { conditions.push('ke.layer = ?'); params.push(layer); }
  if (status) { conditions.push('ke.status = ?'); params.push(status); }

  if (conditions.length) {
    sql += conditions.join(' AND ');
  } else {
    sql += '1=1';
  }
  sql += ' ORDER BY ke.layer, ke.created_at DESC';

  const entries = db.prepare(sql).all(...params) as KnowledgeEntry[];
  res.json(entries);
});

// Get single entry
router.get('/:id', (req: Request, res: Response): void => {
  const user = (req as AuthRequest).user;
  const entry = db.prepare('SELECT * FROM knowledge_entries WHERE id = ?').get(req.params.id) as KnowledgeEntry | undefined;
  if (!entry) { res.status(404).json({ error: 'Not found' }); return; }

  // Permission check
  if (user.role !== 'admin') {
    if (entry.layer === 'company' && entry.status !== 'active') { res.status(403).json({ error: 'Forbidden' }); return; }
    if (entry.layer === 'department') {
      if (entry.department_id !== user.department_id) { res.status(403).json({ error: 'Forbidden' }); return; }
      if (user.role === 'employee' && entry.status !== 'active') { res.status(403).json({ error: 'Forbidden' }); return; }
    }
    if (entry.layer === 'personal' && entry.owner_user_id !== user.id) { res.status(403).json({ error: 'Forbidden' }); return; }
  }
  res.json(entry);
});

// Create entry (manager/admin for dept+company, any for personal)
router.post('/', (req: Request, res: Response): void => {
  const user = (req as AuthRequest).user;
  const { layer, title, content, tags, department_id } = req.body as {
    layer?: string; title?: string; content?: string; tags?: string[]; department_id?: number;
  };

  if (!layer || !title?.trim() || !content?.trim()) {
    res.status(400).json({ error: 'layer, title, and content required' });
    return;
  }

  // Permission checks
  if (layer === 'company' && user.role !== 'admin') { res.status(403).json({ error: 'Only admin can create company entries' }); return; }
  if (layer === 'department' && user.role === 'employee') { res.status(403).json({ error: 'Only managers and admins can create department entries' }); return; }
  if (layer === 'personal' && layer !== 'personal') { /* allowed */ }

  const deptId = layer === 'department'
    ? (user.role === 'admin' ? department_id : user.department_id)
    : null;
  const ownerId = layer === 'personal' ? user.id : null;
  const status = layer === 'company' ? 'active' : layer === 'personal' ? 'active' : 'draft';

  const result = db.prepare(`
    INSERT INTO knowledge_entries (layer, status, department_id, owner_user_id, title, content, tags, created_by, approved_by, approved_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    layer, status, deptId ?? null, ownerId,
    title.trim(), content.trim(),
    JSON.stringify(tags ?? []),
    user.id,
    layer === 'company' || layer === 'personal' ? user.id : null,
    layer === 'company' || layer === 'personal' ? new Date().toISOString() : null
  );

  logAudit(user.id, 'knowledge.create', 'knowledge_entry', result.lastInsertRowid as number, { layer, title });
  const created = db.prepare('SELECT * FROM knowledge_entries WHERE id = ?').get(result.lastInsertRowid) as KnowledgeEntry;
  res.status(201).json(created);
});

// Update entry (manager/admin, draft only unless admin)
router.put('/:id', requireRole('manager', 'admin'), (req: Request, res: Response): void => {
  const user = (req as AuthRequest).user;
  const entry = db.prepare('SELECT * FROM knowledge_entries WHERE id = ?').get(req.params.id) as KnowledgeEntry | undefined;
  if (!entry) { res.status(404).json({ error: 'Not found' }); return; }

  if (user.role === 'manager') {
    if (entry.layer === 'department' && entry.department_id !== user.department_id) { res.status(403).json({ error: 'Forbidden' }); return; }
    if (entry.status !== 'draft') { res.status(403).json({ error: 'Only draft entries can be edited by managers' }); return; }
  }

  const { title, content, tags } = req.body as { title?: string; content?: string; tags?: string[] };
  db.prepare(
    "UPDATE knowledge_entries SET title = COALESCE(?, title), content = COALESCE(?, content), tags = COALESCE(?, tags), updated_at = datetime('now') WHERE id = ?"
  ).run(title?.trim() ?? null, content?.trim() ?? null, tags ? JSON.stringify(tags) : null, entry.id);

  logAudit(user.id, 'knowledge.update', 'knowledge_entry', entry.id);
  const updated = db.prepare('SELECT * FROM knowledge_entries WHERE id = ?').get(entry.id) as KnowledgeEntry;
  res.json(updated);
});

// Approve: draft → active
router.post('/:id/approve', requireRole('manager', 'admin'), (req: Request, res: Response): void => {
  const user = (req as AuthRequest).user;
  const entry = db.prepare('SELECT * FROM knowledge_entries WHERE id = ?').get(req.params.id) as KnowledgeEntry | undefined;
  if (!entry) { res.status(404).json({ error: 'Not found' }); return; }
  if (entry.status !== 'draft') { res.status(400).json({ error: 'Entry is not in draft status' }); return; }

  if (user.role === 'manager' && entry.department_id !== user.department_id) {
    res.status(403).json({ error: 'Forbidden' }); return;
  }

  db.prepare(
    "UPDATE knowledge_entries SET status = 'active', approved_by = ?, approved_at = datetime('now'), updated_at = datetime('now') WHERE id = ?"
  ).run(user.id, entry.id);

  logAudit(user.id, 'knowledge.approve', 'knowledge_entry', entry.id);
  const updated = db.prepare('SELECT * FROM knowledge_entries WHERE id = ?').get(entry.id) as KnowledgeEntry;
  res.json(updated);
});

// Archive: active → archived
router.post('/:id/archive', requireRole('manager', 'admin'), (req: Request, res: Response): void => {
  const user = (req as AuthRequest).user;
  const entry = db.prepare('SELECT * FROM knowledge_entries WHERE id = ?').get(req.params.id) as KnowledgeEntry | undefined;
  if (!entry) { res.status(404).json({ error: 'Not found' }); return; }

  if (user.role === 'manager' && entry.department_id !== user.department_id) {
    res.status(403).json({ error: 'Forbidden' }); return;
  }

  db.prepare("UPDATE knowledge_entries SET status = 'archived', updated_at = datetime('now') WHERE id = ?").run(entry.id);
  logAudit(user.id, 'knowledge.archive', 'knowledge_entry', entry.id);
  res.json({ ok: true });
});

// Hard delete (admin only)
router.delete('/:id', requireRole('admin'), (req: Request, res: Response): void => {
  const user = (req as AuthRequest).user;
  const entry = db.prepare('SELECT id, title FROM knowledge_entries WHERE id = ?').get(req.params.id) as { id: number; title: string } | undefined;
  if (!entry) { res.status(404).json({ error: 'Not found' }); return; }
  db.prepare('DELETE FROM knowledge_entries WHERE id = ?').run(entry.id);
  logAudit(user.id, 'knowledge.delete', 'knowledge_entry', entry.id, { title: entry.title });
  res.json({ ok: true });
});

// Personal note shortcuts
router.post('/personal', (req: Request, res: Response): void => {
  const user = (req as AuthRequest).user;
  req.body.layer = 'personal';
  req.body.department_id = null;

  const { title, content, tags } = req.body as { title?: string; content?: string; tags?: string[] };
  if (!title?.trim() || !content?.trim()) { res.status(400).json({ error: 'title and content required' }); return; }

  const result = db.prepare(
    "INSERT INTO knowledge_entries (layer, status, owner_user_id, title, content, tags, created_by, approved_by, approved_at) VALUES ('personal','active',?,?,?,?,?,?,datetime('now'))"
  ).run(user.id, title.trim(), content.trim(), JSON.stringify(tags ?? []), user.id, user.id);

  logAudit(user.id, 'knowledge.personal.create', 'knowledge_entry', result.lastInsertRowid as number);
  const created = db.prepare('SELECT * FROM knowledge_entries WHERE id = ?').get(result.lastInsertRowid) as KnowledgeEntry;
  res.status(201).json(created);
});

router.put('/personal/:id', (req: Request, res: Response): void => {
  const user = (req as AuthRequest).user;
  const entry = db.prepare('SELECT * FROM knowledge_entries WHERE id = ? AND owner_user_id = ? AND layer = ?').get(req.params.id, user.id, 'personal') as KnowledgeEntry | undefined;
  if (!entry) { res.status(404).json({ error: 'Not found' }); return; }
  const { title, content, tags } = req.body as { title?: string; content?: string; tags?: string[] };
  db.prepare("UPDATE knowledge_entries SET title = COALESCE(?, title), content = COALESCE(?, content), tags = COALESCE(?, tags), updated_at = datetime('now') WHERE id = ?")
    .run(title?.trim() ?? null, content?.trim() ?? null, tags ? JSON.stringify(tags) : null, entry.id);
  const updated = db.prepare('SELECT * FROM knowledge_entries WHERE id = ?').get(entry.id) as KnowledgeEntry;
  res.json(updated);
});

router.delete('/personal/:id', (req: Request, res: Response): void => {
  const user = (req as AuthRequest).user;
  const entry = db.prepare('SELECT id FROM knowledge_entries WHERE id = ? AND owner_user_id = ? AND layer = ?').get(req.params.id, user.id, 'personal') as { id: number } | undefined;
  if (!entry) { res.status(404).json({ error: 'Not found' }); return; }
  db.prepare('DELETE FROM knowledge_entries WHERE id = ?').run(entry.id);
  res.json({ ok: true });
});

export default router;
