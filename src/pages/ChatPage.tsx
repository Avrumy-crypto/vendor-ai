import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import ChatWindow from '../components/ChatWindow';
import { api } from '../api';
import { Conversation, Message } from '../types';

interface DisplayMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  requiresApproval?: boolean;
}

export default function ChatPage() {
  const { convId } = useParams<{ convId?: string }>();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [activeConvId, setActiveConvId] = useState<number | null>(convId ? parseInt(convId, 10) : null);

  const loadConversations = useCallback(async () => {
    try { setConversations(await api.get<Conversation[]>('/api/chat/conversations')); }
    catch (_) {}
  }, []);

  const loadConversation = useCallback(async (id: number) => {
    try {
      const data = await api.get<{ conversation: Conversation; messages: Message[] }>(`/api/chat/conversations/${id}`);
      setMessages(data.messages.map(m => ({ id: m.id, role: m.role, content: m.content })));
    } catch (_) {}
  }, []);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  useEffect(() => {
    if (activeConvId) { loadConversation(activeConvId); }
    else { setMessages([]); }
  }, [activeConvId, loadConversation]);

  const handleNewChat = () => {
    setActiveConvId(null);
    setMessages([]);
    navigate('/chat');
  };

  const handleSelectConv = (id: number) => {
    setActiveConvId(id);
    navigate(`/chat/${id}`);
  };

  const handleConversationCreated = (id: number) => {
    setActiveConvId(id);
    navigate(`/chat/${id}`, { replace: true });
    loadConversations();
  };

  const handleDeleteConv = async (id: number, e: { stopPropagation(): void }) => {
    e.stopPropagation();
    try {
      await api.del(`/api/chat/conversations/${id}`);
      setConversations(prev => prev.filter((c: Conversation) => c.id !== id));
      if (activeConvId === id) handleNewChat();
    } catch (_) {}
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 86400000) return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    if (diff < 604800000) return d.toLocaleDateString('en-US', { weekday: 'short' });
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <Layout>
      <div className="flex h-full">
        {/* Conversation list */}
        <div className="w-56 flex-shrink-0 border-r border-bridge-100 bg-white flex flex-col">
          <div className="p-3 border-b border-bridge-100">
            <button
              onClick={handleNewChat}
              className="w-full py-2 px-3 flex items-center justify-center gap-2 bg-brand-500 text-white text-sm font-medium rounded-xl hover:bg-brand-600 transition-colors shadow-sm"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              New Chat
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {conversations.length === 0 && (
              <div className="text-center py-8">
                <div className="text-2xl mb-2 opacity-30">💬</div>
                <div className="text-xs text-bridge-400">No conversations yet</div>
              </div>
            )}
            {conversations.map(c => (
              <div
                key={c.id}
                onClick={() => handleSelectConv(c.id)}
                className={`group flex items-start gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all mb-0.5 ${
                  activeConvId === c.id
                    ? 'bg-brand-50 text-brand-800 border border-brand-100'
                    : 'hover:bg-bridge-50 text-bridge-700 border border-transparent'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate leading-snug">{c.title ?? 'Untitled'}</div>
                  <div className="text-xs text-bridge-400 mt-0.5">{formatDate(c.updated_at)}</div>
                </div>
                <button
                  onClick={e => handleDeleteConv(c.id, e)}
                  className="opacity-0 group-hover:opacity-100 text-bridge-300 hover:text-red-400 transition-all mt-0.5 flex-shrink-0"
                  title="Delete"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Chat area */}
        <div className="flex-1 flex flex-col min-w-0">
          <ChatWindow
            conversationId={activeConvId}
            initialMessages={messages}
            onConversationCreated={handleConversationCreated}
          />
        </div>
      </div>
    </Layout>
  );
}
