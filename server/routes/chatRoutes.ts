import { Router, Request, Response } from 'express';
import db from '../db';
import { requireAuth, AuthRequest } from '../auth';
import { logAudit } from '../audit';
import {
  getAllCompanyEntries,
  getAllDepartmentEntries,
  getPersonalEntries,
  retrieveRelevantContext
} from '../services/ragService';
import { chat } from '../services/claudeService';
import { shouldLookupVendors, lookupVendors } from '../services/vendorService';
import { Conversation, Message } from '../types';

const router = Router();

router.use(requireAuth);

router.get('/conversations', (req: Request, res: Response): void => {
  const user = (req as AuthRequest).user;
  const convs = db.prepare(
    'SELECT id, title, created_at, updated_at FROM conversations WHERE user_id = ? ORDER BY updated_at DESC LIMIT 50'
  ).all(user.id) as Conversation[];
  res.json(convs);
});

router.get('/conversations/:id', (req: Request, res: Response): void => {
  const user = (req as AuthRequest).user;
  const conv = db.prepare(
    'SELECT id, title, created_at, updated_at FROM conversations WHERE id = ? AND user_id = ?'
  ).get(req.params.id, user.id) as Conversation | undefined;
  if (!conv) { res.status(404).json({ error: 'Not found' }); return; }

  const messages = db.prepare(
    'SELECT id, role, content, sources, created_at FROM messages WHERE conversation_id = ? ORDER BY created_at ASC'
  ).all(conv.id) as Message[];
  res.json({ conversation: conv, messages });
});

router.delete('/conversations/:id', (req: Request, res: Response): void => {
  const user = (req as AuthRequest).user;
  const conv = db.prepare('SELECT id FROM conversations WHERE id = ? AND user_id = ?').get(req.params.id, user.id) as { id: number } | undefined;
  if (!conv) { res.status(404).json({ error: 'Not found' }); return; }
  db.prepare('DELETE FROM messages WHERE conversation_id = ?').run(conv.id);
  db.prepare('DELETE FROM conversations WHERE id = ?').run(conv.id);
  logAudit(user.id, 'conversation.delete', 'conversation', conv.id);
  res.json({ ok: true });
});

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const user = (req as AuthRequest).user;
  const { conversationId, message } = req.body as { conversationId?: number; message?: string };

  if (!message?.trim()) { res.status(400).json({ error: 'Message required' }); return; }

  // Get or create conversation
  let convId = conversationId;
  if (!convId) {
    const title = message.slice(0, 60);
    const result = db.prepare(
      'INSERT INTO conversations (user_id, title) VALUES (?, ?)'
    ).run(user.id, title);
    convId = result.lastInsertRowid as number;
  } else {
    const existing = db.prepare('SELECT id FROM conversations WHERE id = ? AND user_id = ?').get(convId, user.id) as { id: number } | undefined;
    if (!existing) { res.status(404).json({ error: 'Conversation not found' }); return; }
  }

  // Load previous messages (last 20 for history)
  const prevMessages = db.prepare(
    'SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT 20'
  ).all(convId).reverse() as Array<{ role: 'user' | 'assistant'; content: string }>;

  // Save user message
  db.prepare(
    'INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)'
  ).run(convId, 'user', message);

  // Get department info
  const dept = user.department_id
    ? db.prepare('SELECT name, display_name FROM departments WHERE id = ?').get(user.department_id) as { name: string; display_name: string } | undefined
    : null;
  const departmentName = dept?.display_name ?? 'General';

  // Build knowledge context
  const companyEntries = getAllCompanyEntries(user);
  const deptEntries = getAllDepartmentEntries(user);
  const personalEntries = getPersonalEntries(user);
  const ragEntries = retrieveRelevantContext(message, user);

  // Vendor lookup if relevant
  let vendorData = '';
  if (shouldLookupVendors(message)) {
    vendorData = await lookupVendors(message.slice(0, 100));
  }

  // Build messages array for Claude (history + current)
  const claudeMessages = [
    ...prevMessages,
    { role: 'user' as const, content: message }
  ];

  // Call Claude
  const result = await chat(
    claudeMessages, user, departmentName,
    companyEntries, deptEntries, personalEntries, ragEntries, vendorData
  );

  // Save assistant message
  const msgRow = db.prepare(
    'INSERT INTO messages (conversation_id, role, content, sources) VALUES (?, ?, ?, ?)'
  ).run(convId, 'assistant', result.content, JSON.stringify(result.sources));

  // Update conversation timestamp
  db.prepare('UPDATE conversations SET updated_at = datetime(\'now\') WHERE id = ?').run(convId);

  logAudit(user.id, 'chat.message', 'conversation', convId, {
    sourceCount: result.sources.length,
    requiresApproval: result.requiresApproval
  });

  res.json({
    conversationId: convId,
    messageId: msgRow.lastInsertRowid,
    content: result.content,
    sources: result.sources,
    requiresApproval: result.requiresApproval
  });
});

export default router;
