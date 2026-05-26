export interface Department {
  id: number;
  name: string;
  display_name: string;
  created_at: string;
}

export interface User {
  id: number;
  email: string;
  display_name: string;
  role: 'employee' | 'manager' | 'admin';
  department_id: number | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface UserWithDept extends User {
  department_name: string | null;
  department_display_name: string | null;
}

export interface KnowledgeEntry {
  id: number;
  layer: 'company' | 'department' | 'personal';
  status: 'draft' | 'active' | 'archived';
  department_id: number | null;
  owner_user_id: number | null;
  title: string;
  content: string;
  tags: string;
  created_by: number;
  approved_by: number | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: number;
  user_id: number;
  title: string | null;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: number;
  conversation_id: number;
  role: 'user' | 'assistant';
  content: string;
  sources: string;
  metadata: string;
  created_at: string;
}

export interface AuditEntry {
  id: number;
  user_id: number | null;
  action: string;
  target_type: string | null;
  target_id: number | null;
  details: string;
  created_at: string;
}

export interface SourceRef {
  id: number;
  title: string;
  layer: 'company' | 'department' | 'personal';
}

declare module 'express-session' {
  interface SessionData {
    userId: number;
  }
}
