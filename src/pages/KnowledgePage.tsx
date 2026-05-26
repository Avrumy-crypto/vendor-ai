import { useState, useEffect, useCallback } from 'react';
import Layout from '../components/Layout';
import KnowledgeList from '../components/KnowledgeList';
import KnowledgeForm from '../components/KnowledgeForm';
import { api } from '../api';
import { KnowledgeEntry, Department } from '../types';
import { useAuth } from '../context/AuthContext';

type TabId = 'active' | 'draft' | 'archived';

const tabs: { id: TabId; label: string; icon: string }[] = [
  { id: 'active',   label: 'Active',   icon: '✓' },
  { id: 'draft',    label: 'Drafts',   icon: '✏️' },
  { id: 'archived', label: 'Archived', icon: '📦' },
];

export default function KnowledgePage() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [tab, setTab] = useState<TabId>('active');
  const [showForm, setShowForm] = useState(false);
  const [editEntry, setEditEntry] = useState<KnowledgeEntry | undefined>();
  const [loading, setLoading] = useState(true);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<KnowledgeEntry[]>(`/api/knowledge?status=${tab}`);
      setEntries(data.filter(e => e.layer !== 'personal'));
    } catch (_) {}
    setLoading(false);
  }, [tab]);

  useEffect(() => {
    api.get<Department[]>('/api/departments').then(setDepartments).catch(() => {});
  }, []);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  const handleApprove = async (id: number) => {
    try { await api.post(`/api/knowledge/${id}/approve`, {}); loadEntries(); }
    catch (err) { alert(err instanceof Error ? err.message : 'Approve failed'); }
  };

  const handleArchive = async (id: number) => {
    if (!confirm('Archive this entry? It will no longer be used by the AI.')) return;
    try { await api.post(`/api/knowledge/${id}/archive`, {}); loadEntries(); }
    catch (err) { alert(err instanceof Error ? err.message : 'Archive failed'); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Permanently delete this entry? This cannot be undone.')) return;
    try { await api.del(`/api/knowledge/${id}`); loadEntries(); }
    catch (err) { alert(err instanceof Error ? err.message : 'Delete failed'); }
  };

  const handleSaved = (entry: KnowledgeEntry) => {
    setShowForm(false);
    setEditEntry(undefined);
    loadEntries();
    if (entry.status === 'draft') setTab('draft');
  };

  const draftCount = tab === 'draft' ? entries.length : 0;
  const dept = user?.department_id
    ? departments.find(d => d.id === user.department_id)
    : null;

  return (
    <Layout>
      <div className="h-full overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="flex items-start justify-between mb-8">
            <div>
              <h1 className="font-display text-2xl font-bold text-bridge-900">Knowledge Base</h1>
              <p className="text-sm text-bridge-500 mt-1">
                {dept ? `${dept.display_name} department` : 'All departments'} · Entries are used by the AI to answer employee questions
              </p>
            </div>
            <button
              onClick={() => { setEditEntry(undefined); setShowForm(v => !v); }}
              className="btn-primary flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Entry
            </button>
          </div>

          {/* How it works — info banner */}
          <div className="bg-brand-50 border border-brand-100 rounded-2xl p-4 mb-6 flex gap-3">
            <div className="text-brand-500 mt-0.5 flex-shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-sm text-brand-800">
              <strong>How the approval workflow works:</strong> New entries start as <em>Draft</em>. Once you review and approve them, they become <em>Active</em> and are immediately available to every employee's AI in this department. Archived entries are removed from the AI but kept for reference.
            </div>
          </div>

          {/* Slide-down form */}
          {showForm && (
            <div className="card p-6 mb-6 border-brand-200 ring-2 ring-brand-100">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-lg font-bold text-bridge-900">
                  {editEntry ? 'Edit Entry' : 'New Knowledge Entry'}
                </h2>
                <button onClick={() => { setShowForm(false); setEditEntry(undefined); }} className="text-bridge-400 hover:text-bridge-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <KnowledgeForm
                departments={departments}
                editEntry={editEntry}
                onSaved={handleSaved}
                onCancel={() => { setShowForm(false); setEditEntry(undefined); }}
              />
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 bg-bridge-100 p-1 rounded-xl mb-5 w-fit">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                  tab === t.id
                    ? 'bg-white text-bridge-900 shadow-sm'
                    : 'text-bridge-500 hover:text-bridge-700'
                }`}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <svg className="animate-spin h-6 w-6 text-brand-400" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            </div>
          ) : (
            <KnowledgeList
              entries={entries}
              onApprove={handleApprove}
              onArchive={handleArchive}
              onEdit={entry => { setEditEntry(entry); setShowForm(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              onDelete={handleDelete}
            />
          )}
        </div>
      </div>
    </Layout>
  );
}
