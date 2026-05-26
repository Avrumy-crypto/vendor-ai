import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import MessageBubble from './MessageBubble';
import { api } from '../api';
import { ChatResponse } from '../types';

interface DisplayMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  requiresApproval?: boolean;
}

interface Props {
  conversationId: number | null;
  initialMessages: DisplayMessage[];
  onConversationCreated: (id: number) => void;
}

const STARTERS = [
  'What flute should I use for a heavy-duty export box?',
  'Help me quote a five-panel folder with litho label.',
  'What board grade do we use for a 200# RSC?',
  'Who are our preferred vendors for folding cartons?',
];

export default function ChatWindow({ conversationId, initialMessages, onConversationCreated }: Props) {
  const [messages, setMessages] = useState<DisplayMessage[]>(initialMessages);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [convId, setConvId] = useState<number | null>(conversationId);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setMessages(initialMessages);
    setConvId(conversationId);
  }, [conversationId, initialMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    setError('');
    const userMsg: DisplayMessage = { id: Date.now(), role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    try {
      const data = await api.post<ChatResponse>('/api/chat', { conversationId: convId, message: text });
      if (!convId) {
        setConvId(data.conversationId);
        onConversationCreated(data.conversationId);
      }
      setMessages(prev => [...prev, {
        id: data.messageId,
        role: 'assistant',
        content: data.content,
        requiresApproval: data.requiresApproval
      }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
      setMessages(prev => prev.filter(m => m.id !== userMsg.id));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px';
  };

  return (
    <div className="flex flex-col h-full bg-bridge-50">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-brand-500 flex items-center justify-center text-white text-2xl font-bold mb-4 shadow-lift">
              AI
            </div>
            <h2 className="font-display text-xl font-bold text-bridge-900 mb-1">How can I help?</h2>
            <p className="text-sm text-bridge-400 mb-8 max-w-sm">
              Ask about quoting, board grades, flute selection, vendors, or anything in your knowledge base.
            </p>
            <div className="grid grid-cols-2 gap-2 max-w-lg w-full">
              {STARTERS.map(s => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-left text-xs p-3 bg-white border border-bridge-200 rounded-xl hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 transition-colors text-bridge-600 shadow-card"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map(msg => (
          <MessageBubble
            key={msg.id}
            role={msg.role}
            content={msg.content}
            requiresApproval={msg.requiresApproval}
            onConfirm={() => send('confirm')}
            onCancel={() => send('cancel')}
          />
        ))}

        {loading && (
          <div className="flex justify-start mb-5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center text-white text-xs font-bold mr-2.5 flex-shrink-0 shadow-sm">
              AI
            </div>
            <div className="bg-white border border-bridge-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-card">
              <div className="flex gap-1.5 items-center h-4">
                {[0, 150, 300].map(d => (
                  <span key={d} className="w-2 h-2 bg-brand-300 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {error && (
        <div className="mx-4 mb-2 px-3 py-2 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl flex items-center gap-2">
          <span>⚠</span> {error}
        </div>
      )}

      {/* Input bar */}
      <div className="px-4 pb-4 pt-3 bg-white border-t border-bridge-100">
        <div className="flex gap-2 items-end bg-bridge-50 rounded-2xl border border-bridge-200 focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-100 transition-all p-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything… (Enter to send, Shift+Enter for new line)"
            rows={1}
            disabled={loading}
            className="flex-1 resize-none bg-transparent px-2 py-1 text-sm text-bridge-900 placeholder:text-bridge-400 focus:outline-none disabled:opacity-50 leading-relaxed"
          />
          <button
            onClick={() => send(input)}
            disabled={!input.trim() || loading}
            className="flex-shrink-0 w-9 h-9 bg-brand-500 text-white rounded-xl flex items-center justify-center hover:bg-brand-600 disabled:opacity-40 transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
        <p className="text-xs text-bridge-400 text-center mt-2">AI answers from your knowledge base — always verify before quoting.</p>
      </div>
    </div>
  );
}
