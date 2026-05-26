import { useState, useEffect, useCallback } from 'react';
import Layout from '../components/Layout';
import { api } from '../api';
import { AuditEntry } from '../types';

const actionColors: Record<string, string> = {
  'auth':       'bg-bridge-100 text-bridge-600',
  'chat':       'bg-emerald-50 text-emerald-700',
  'knowledge':  'bg-brand-50 text-brand-600',
  'user':       'bg-purple-50 text-purple-700',
  'invite':     'bg-amber-50 text-amber-700',
  'export':     'bg-red-50 text-red-600',
};

function actionColor(action: string) {
  const prefix = action.split('.')[0];
  return actionColors[prefix] ?? 'bg-bridge-100 text-bridge-600';
}

export default function AuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '50' });
      if (filter) params.set('action', filter);
      const data = await api.get<{ entries: AuditEntry[]; total: number }>(`/api/audit?${params}`);
      setEntries(data.entries);
      setTotal(data.total);
    } catch (_) {}
    setLoading(false);
  }, [page, filter]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.ceil(total / 50);

  return (
    <Layout>
      <div className="h-full overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="mb-8">
            <h1 className="font-display text-2xl font-bold text-bridge-900">Audit Log</h1>
            <p className="text-sm text-bridge-500 mt-1">All actions taken by users in this workspace</p>
          </div>

          <div className="flex items-center gap-4 mb-5">
            <div className="relative flex-1 max-w-xs">
              <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-bridge-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                value={filter}
                onChange={e => { setFilter(e.target.value); setPage(1); }}
                placeholder="Filter by action (e.g. knowledge, chat)"
                className="input pl-9"
              />
            </div>
            <span className="text-sm text-bridge-400 font-medium">{total.toLocaleString()} entries</span>
          </div>

          <div className="card overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <svg className="animate-spin h-6 w-6 text-brand-400" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-bridge-50 border-b border-bridge-100">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-bridge-500 uppercase tracking-wide w-36">Time</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-bridge-500 uppercase tracking-wide">User</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-bridge-500 uppercase tracking-wide">Action</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-bridge-500 uppercase tracking-wide">Target</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-bridge-500 uppercase tracking-wide">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-bridge-50">
                  {entries.map(e => (
                    <tr key={e.id} className="hover:bg-bridge-50 transition-colors">
                      <td className="px-4 py-3 text-bridge-400 text-xs whitespace-nowrap">
                        {new Date(e.created_at).toLocaleString('en-US', {
                          month: 'short', day: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </td>
                      <td className="px-4 py-3">
                        {e.user_name ? (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-brand-500 flex items-center justify-center text-white text-xs font-bold">
                              {e.user_name[0]?.toUpperCase()}
                            </div>
                            <span className="text-bridge-700 font-medium">{e.user_name}</span>
                          </div>
                        ) : <span className="text-bridge-400">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-md font-mono font-medium ${actionColor(e.action)}`}>
                          {e.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-bridge-400 text-xs">
                        {e.target_type ? `${e.target_type} #${e.target_id}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-bridge-400 text-xs font-mono max-w-xs truncate">
                        {e.details !== '{}' ? e.details : ''}
                      </td>
                    </tr>
                  ))}
                  {entries.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center text-bridge-400 py-12">No entries found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-5">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-40">
                ← Previous
              </button>
              <span className="text-sm text-bridge-500 px-2">Page {page} of {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-40">
                Next →
              </button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
