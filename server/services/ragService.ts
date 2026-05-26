import db from '../db';
import { KnowledgeEntry, User } from '../types';

interface PermissionFilter {
  sql: string;
  params: unknown[];
}

function buildPermissionFilter(user: User): PermissionFilter {
  if (user.role === 'admin') {
    return { sql: "ke.status IN ('draft','active','archived')", params: [] };
  }
  if (user.role === 'manager') {
    return {
      sql: `(
        (ke.layer = 'company' AND ke.status = 'active')
        OR (ke.layer = 'department' AND ke.department_id = ? AND ke.status IN ('draft','active'))
        OR (ke.layer = 'personal' AND ke.owner_user_id = ?)
      )`,
      params: [user.department_id, user.id]
    };
  }
  return {
    sql: `(
      (ke.layer = 'company' AND ke.status = 'active')
      OR (ke.layer = 'department' AND ke.department_id = ? AND ke.status = 'active')
      OR (ke.layer = 'personal' AND ke.owner_user_id = ?)
    )`,
    params: [user.department_id, user.id]
  };
}

function escapeQuery(q: string): string {
  return q.replace(/["]/g, '""').replace(/[*]/g, '').trim();
}

export function getAllCompanyEntries(user: User): KnowledgeEntry[] {
  const filter = buildPermissionFilter(user);
  return db.prepare(`
    SELECT ke.*
    FROM knowledge_entries ke
    WHERE ke.layer = 'company' AND ke.status = 'active'
    ORDER BY ke.created_at ASC
  `).all() as KnowledgeEntry[];
}

export function getAllDepartmentEntries(user: User): KnowledgeEntry[] {
  if (!user.department_id) return [];
  const status = user.role === 'manager' || user.role === 'admin'
    ? "IN ('draft','active')"
    : "= 'active'";
  return db.prepare(`
    SELECT ke.*
    FROM knowledge_entries ke
    WHERE ke.layer = 'department'
      AND ke.department_id = ?
      AND ke.status ${status}
    ORDER BY ke.created_at ASC
  `).all(user.department_id) as KnowledgeEntry[];
}

export function getPersonalEntries(user: User): KnowledgeEntry[] {
  return db.prepare(`
    SELECT ke.*
    FROM knowledge_entries ke
    WHERE ke.layer = 'personal' AND ke.owner_user_id = ?
    ORDER BY ke.created_at ASC
  `).all(user.id) as KnowledgeEntry[];
}

export function retrieveRelevantContext(query: string, user: User, topN = 8): KnowledgeEntry[] {
  const filter = buildPermissionFilter(user);
  const safe = escapeQuery(query);

  if (!safe) return [];

  // Try phrase match first
  try {
    const results = db.prepare(`
      SELECT ke.*, fts.rank
      FROM knowledge_fts fts
      JOIN knowledge_entries ke ON ke.id = fts.rowid
      WHERE knowledge_fts MATCH ?
        AND ${filter.sql}
        AND ke.status IN ('active','draft')
      ORDER BY fts.rank
      LIMIT ?
    `).all([`"${safe}"`, ...filter.params, topN]) as KnowledgeEntry[];

    if (results.length > 0) return results;
  } catch (_) {
    // fall through to token search
  }

  // Fallback: individual token OR search
  const tokens = safe.split(/\s+/).filter(t => t.length > 3);
  if (tokens.length === 0) return [];
  const ftsQuery = tokens.map(t => `"${t}"`).join(' OR ');
  try {
    return db.prepare(`
      SELECT ke.*, fts.rank
      FROM knowledge_fts fts
      JOIN knowledge_entries ke ON ke.id = fts.rowid
      WHERE knowledge_fts MATCH ?
        AND ${filter.sql}
        AND ke.status IN ('active','draft')
      ORDER BY fts.rank
      LIMIT ?
    `).all([ftsQuery, ...filter.params, topN]) as KnowledgeEntry[];
  } catch (_) {
    return [];
  }
}
