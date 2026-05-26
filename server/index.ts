import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import SqliteStore from 'better-sqlite3-session-store';
import path from 'path';
import fs from 'fs';
import db from './db';
import { loadUser } from './auth';
import authRoutes from './routes/authRoutes';
import chatRoutes from './routes/chatRoutes';
import knowledgeRoutes from './routes/knowledgeRoutes';
import userRoutes from './routes/userRoutes';
import auditRoutes from './routes/auditRoutes';
import inviteRoutes from './routes/inviteRoutes';
import exportRoutes from './routes/exportRoutes';

const app = express();
const PORT = parseInt(process.env.PORT ?? '5176', 10);

app.use(express.json({ limit: '10mb' }));

const Store = SqliteStore(session);
app.use(session({
  store: new Store({ client: db }),
  secret: process.env.SESSION_SECRET ?? 'dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 8 * 60 * 60 * 1000
  }
}));

app.use(loadUser);

app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/knowledge', knowledgeRoutes);
app.use('/api/users', userRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/invites', inviteRoutes);
app.use('/api/export', exportRoutes);

app.get('/api/departments', (_req, res) => {
  const depts = db.prepare('SELECT id, name, display_name FROM departments ORDER BY display_name ASC').all();
  res.json(depts);
});

app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Serve built frontend in production
const staticDir = path.join(__dirname, '..');
if (fs.existsSync(path.join(staticDir, 'index.html'))) {
  app.use(express.static(staticDir));
  app.get('*', (_req, res) => res.sendFile(path.join(staticDir, 'index.html')));
}

app.listen(PORT, () => {
  console.log(`Five Star AI Workspace API → http://localhost:${PORT}`);
});
