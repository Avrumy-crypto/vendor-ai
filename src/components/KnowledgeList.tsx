import { useState } from 'react';
import { KnowledgeEntry } from '../types';
import { useAuth } from '../context/AuthContext';

interface Props {
  entries: KnowledgeEntry[];
  onApprove: (id: number) => void;
  onArchive: (id: number) => void;
  onEdit: (entry: KnowledgeEntry) => void;
  onDelete: (id: number) => void;
}

const layerConfig = {
  company:    { badge: 'badge-company',    icon: '🏢', label: 'Company-Wide' },
  department: { badge: 'badge-department', icon: '📋', label: 'Department' },
  personal:   { badge: 'badge-personal',   icon: '🔒', label: 'Personal' },
};

const statusConfig = {
  draft:    { badge: 'badge-draft',    icon: '✏️' },
  active:   { badge: 'badge-active',   icon: '✓' },
  archived: { badge: 'badge-archived', icon: '📦' },
};

export default function KnowledgeList({ entries, onApprove, onArchive, onEdit, onDelete }: Props) {
  const { user } = useAuth();
  const [expanded, setExpanded] = useState<number | null>(null);

  if (!entries.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="text-5xl mb-3 opacity-40">📚</div>
        <div className="text-bridge-500 font-medium">No entries here yet</div>
        <div className="text-bridge-400 text-sm mt-1">Create a new entry using the button above.</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {entries.map(e => {
        const layer = layerConfig[e.layer];
        const status = statusConfig[e.status];
        const isExpanded = expanded === e.id;

        return (
          <div key={e.id} className="card overflow-hidden hover:shadow-card-hover transition-shadow">
            <div
              className="p-4 cursor-pointer"
              onClick={() => setExpanded(isExpanded ? null : e.id)}
            >
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center text-lg flex-shrink-0 mt-0.5">
                  {layer.icon}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={layer.badge}>{layer.label}{e.department_display_name ? ` · ${e.department_display_name}` : ''}</span>
                    <span className={status.badge}>{status.icon} {e.status}</span>
                  </div>
                  <div className="font-semibold text-bridge-900 text-sm">{e.title}</div>
                  {!isExpanded && (
                    <div className="text-xs text-bridge-500 mt-1 line-clamp-2">{e.content}</div>
                  )}
                  <div className="text-xs text-bridge-400 mt-1.5">
                    By {e.created_by_name ?? `#${e.created_by}`} · {new Date(e.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    {e.approved_at && <> · Approved {new Date(e.approved_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</>}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex-shrink-0 flex items-center gap-2">
                  {e.status === 'draft' && (user?.role === 'manager' || user?.role === 'admin') && (
                    <button
                      onClick={ev => { ev.stopPropagation(); onApprove(e.id); }}
                      className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs rounded-lg font-medium transition-colors shadow-sm"
                    >
                      ✓ Approve
                    </button>
                  )}
                  {e.status === 'draft' && (
                    <button
                      onClick={ev => { ev.stopPropagation(); onEdit(e); }}
                      className="px-3 py-1.5 btn-secondary text-xs rounded-lg py-1.5"
                    >
                      Edit
                    </button>
                  )}
                  {e.status === 'active' && (user?.role === 'manager' || user?.role === 'admin') && (
                    <button
                      onClick={ev => { ev.stopPropagation(); onArchive(e.id); }}
                      className="px-3 py-1.5 text-bridge-500 hover:text-bridge-700 text-xs border border-bridge-200 rounded-lg transition-colors"
                    >
                      Archive
                    </button>
                  )}
                  {user?.role === 'admin' && (
                    <button
                      onClick={ev => { ev.stopPropagation(); onDelete(e.id); }}
                      className="w-7 h-7 flex items-center justify-center text-bridge-300 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
                      title="Delete permanently"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                  <svg
                    className={`w-4 h-4 text-bridge-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Expanded content */}
            {isExpanded && (
              <div className="border-t border-bridge-100 px-4 pb-4 pt-3 bg-bridge-50">
                <pre className="text-sm text-bridge-700 whitespace-pre-wrap font-sans leading-relaxed">{e.content}</pre>
                {e.tags && JSON.parse(e.tags).length > 0 && (
                  <div className="flex gap-1.5 mt-3 flex-wrap">
                    {(JSON.parse(e.tags) as string[]).map(tag => (
                      <span key={tag} className="text-xs bg-bridge-200 text-bridge-600 px-2 py-0.5 rounded-full">{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
