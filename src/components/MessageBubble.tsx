import { ReactNode } from 'react';
import SourceBadge from './SourceBadge';

interface Props {
  role: 'user' | 'assistant';
  content: string;
  requiresApproval?: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
}

function parseContent(content: string): ReactNode[] {
  const parts = content.split(/(\[\[src:\d+:[^\]]+\]\])/g);
  return parts.flatMap((part, i) => {
    const match = part.match(/^\[\[src:(\d+):(.+):(\w+)\]\]$/);
    if (match) {
      return [(
        <SourceBadge
          key={i}
          id={parseInt(match[1], 10)}
          title={match[2]}
          layer={match[3] as 'company' | 'department' | 'personal'}
        />
      )];
    }
    return part.split('\n').flatMap((line, j, arr) =>
      j < arr.length - 1 ? [line, <br key={`${i}-${j}`} />] : [line]
    );
  });
}

export default function MessageBubble({ role, content, requiresApproval, onConfirm, onCancel }: Props) {
  const isUser = role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-5`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center text-white text-xs font-bold mr-2.5 flex-shrink-0 mt-0.5 shadow-sm">
          AI
        </div>
      )}
      <div
        className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? 'bg-brand-500 text-white rounded-tr-sm shadow-sm'
            : 'bg-white border border-bridge-100 text-bridge-800 rounded-tl-sm shadow-card'
        }`}
      >
        <div className="whitespace-pre-wrap break-words">{parseContent(content)}</div>

        {requiresApproval && onConfirm && onCancel && (
          <div className="mt-4 pt-3 border-t border-amber-200 flex gap-2">
            <button
              onClick={onConfirm}
              className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs rounded-lg font-medium transition-colors shadow-sm"
            >
              ✓ Confirm
            </button>
            <button
              onClick={onCancel}
              className="px-4 py-1.5 bg-bridge-100 hover:bg-bridge-200 text-bridge-700 text-xs rounded-lg font-medium transition-colors"
            >
              ✕ Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
