export interface Department {
  id: number;
  name: string;
  display_name: string;
}

export interface User {
  id: number;
  email: string;
  display_name: string;
  role: 'employee' | 'manager' | 'admin';
  department_id: number | null;
  is_active: number;
  created_at: string;
  department?: Department | null;
  google_avatar?: string | null;
  department_display_name?: string | null;
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
  created_by_name?: string;
  approved_by: number | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
  department_display_name?: string;
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
  created_at: string;
}

export interface SourceRef {
  id: number;
  title: string;
  layer: 'company' | 'department' | 'personal';
}

export interface ChatResponse {
  conversationId: number;
  messageId: number;
  content: string;
  sources: SourceRef[];
  requiresApproval: boolean;
}

export interface AuditEntry {
  id: number;
  user_id: number | null;
  user_name?: string;
  user_email?: string;
  action: string;
  target_type: string | null;
  target_id: number | null;
  details: string;
  created_at: string;
}

export interface Invite {
  id: number;
  token: string;
  email: string | null;
  role: string;
  department_id: number | null;
  department_name?: string | null;
  created_by: number;
  created_by_name?: string;
  created_at: string;
  expires_at: string;
  used_at: string | null;
  used_by: number | null;
  used_by_name?: string | null;
}
