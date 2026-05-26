import { useState, useEffect, useCallback, FormEvent } from 'react';
import Layout from '../components/Layout';
import KnowledgeList from '../components/KnowledgeList';
import KnowledgeForm from '../components/KnowledgeForm';
import { api } from '../api';
import { User, KnowledgeEntry, Department, Invite } from '../types';

type TabId = 'users' | 'invites' | 'company-knowledge';

const APP_URL = `${window.location.protocol}//${window.location.host}`;

export default function AdminPage() {
  const [tab, setTab] = useState<TabId>('users');
  const [users, setUsers] = useState<(User & { department_display_name: string | null })[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [companyEntries, setCompanyEntries] = useState<KnowledgeEntry[]>([]);
  const [showUserForm, setShowUserForm] = useState(false);
  const [showKnowledgeForm, setShowKnowledgeForm] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [editEntry, setEditEntry] = useState<KnowledgeEntry | undefined>();
  const [copiedToken, setCopiedToken] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);

  const [newUser, setNewUser] = useState({ email: '', password: '', display_name: '', role: 'employee', department_id: '' });
  const [userError, setUserError] = useState('');
  const [userSaving, setUserSaving] = useState(false);

  const [newInvite, setNewInvite] = useState({ email: '', role: 'employee', department_id: '' });
  const [inviteError, setInviteError] = useState('');
  const [inviteSaving, setInviteSaving] = useState(false);

  const loadUsers = useCallback(async () => {
    try { setUsers(await api.get('/api/users')); } catch (_) {}
  }, []);
  const loadInvites = useCallback(async () => {
    try { setInvites(await api.get('/api/invites')); } catch (_) {}
  }, []);
  const loadCompanyKnowledge = useCallback(async () => {
    try { setCompanyEntries(await api.get<KnowledgeEntry[]>('/api/knowledge?layer=company')); } catch (_) {}
  }, []);

  useEffect(() => {
    api.get<Department[]>('/api/departments').then(setDepartments).catch(() => {});
    loadUsers(); loadInvites(); loadCompanyKnowledge();
  }, [loadUsers, loadInvites, loadCompanyKnowledge]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch('/api/export/all', { credentials: 'include' });
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `fivestar-workspace-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
    } catch (_) { alert('Export failed'); }
    finally { setExporting(false); }
  };

  const handleCreateUser = async (e: FormEvent) => {
    e.preventDefault(); setUserError(''); setUserSaving(true);
    try {
      await api.post('/api/users', { ...newUser, department_id: newUser.department_id ? parseInt(newUser.department_id, 10) : null });
      setNewUser({ email: '', password: '', display_name: '', role: 'employee', department_id: '' });
      setShowUserForm(false); loadUsers();
    } catch (err) { setUserError(err instanceof Error ? err.message : 'Failed'); }
    finally { setUserSaving(false); }
  };

  const handleCreateInvite = async (e: FormEvent) => {
    e.preventDefault(); setInviteError(''); setInviteSaving(true);
    try {
      await api.post('/api/invites', { ...newInvite, department_id: newInvite.department_id ? parseInt(newInvite.department_id, 10) : null });
      setNewInvite({ email: '', role: 'employee', department_id: '' });
      setShowInviteForm(false); loadInvites();
    } catch (err) { setInviteError(err instanceof Error ? err.message : 'Failed'); }
    finally { setInviteSaving(false); }
  };

  const copyInviteLink = (invite: Invite) => {
    const url = `${APP_URL}/invite/${invite.token}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedToken(invite.id);
      setTimeout(() => setCopiedToken(null), 2000);
    });
  };

  const revokeInvite = async (id: number) => {
    if (!confirm('Revoke this invite?')) return;
    try { await api.del(`/api/invites/${id}`); loadInvites(); } catch (_) {}
  };

  const toggleActive = async (u: User) => {
    try { await api.put(`/api/users/${u.id}`, { is_active: u.is_active ? 0 : 1 }); loadUsers(); } catch (_) {}
  };

  const pendingInvites = invites.filter(i => !i.used_at);
  const usedInvites   = invites.filter(i =>  i.used_at);

  const tabDefs: { id: TabId; label: string; count?: number }[] = [
    { id: 'users',            label: 'Team Members', count: users.length },
    { id: 'invites',          label: 'Invites',      count: pendingInvites.length },
    { id: 'company-knowledge',label: 'Company Knowledge' },
  ];

  return (
    <Layout>
      <div className="h-full overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="font-display text-2xl font-bold text-bridge-900">Admin</h1>
              <p className="text-sm text-bridge-500 mt-1">Manage team, invites, and company knowledge</p>
            </div>
            <button onClick={handleExport} disabled={exporting} className="btn-secondary flex items-center gap-2">
              {exporting ? (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              )}
              Export All Data
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-bridge-100 p-1 rounded-xl mb-6 w-fit">
            {tabDefs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-2 ${
                  tab === t.id ? 'bg-white text-bridge-900 shadow-sm' : 'text-bridge-500 hover:text-bridge-700'
                }`}>
                {t.label}
                {t.count !== undefined && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${tab === t.id ? 'bg-brand-100 text-brand-600' : 'bg-bridge-200 text-bridge-500'}`}>
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* ─── USERS TAB ─── */}
          {tab === 'users' && (
            <div>
              <div className="flex justify-end mb-4">
                <button onClick={() => setShowUserForm(v => !v)} className="btn-primary flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                  Add User
                </button>
              </div>

              {showUserForm && (
                <div className="card p-6 mb-5 ring-2 ring-brand-100 border-brand-200">
                  <h2 className="font-display font-bold text-bridge-900 mb-4">Create User Account</h2>
                  <form onSubmit={handleCreateUser} className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-bridge-700 mb-1.5">Full Name</label>
                      <input required value={newUser.display_name} onChange={e => setNewUser(u => ({ ...u, display_name: e.target.value }))} className="input" placeholder="Jane Smith" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-bridge-700 mb-1.5">Email</label>
                      <input required type="email" value={newUser.email} onChange={e => setNewUser(u => ({ ...u, email: e.target.value }))} className="input" placeholder="jane@fivestarcorr.com" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-bridge-700 mb-1.5">Password</label>
                      <input required type="password" value={newUser.password} onChange={e => setNewUser(u => ({ ...u, password: e.target.value }))} className="input" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-bridge-700 mb-1.5">Role</label>
                      <select value={newUser.role} onChange={e => setNewUser(u => ({ ...u, role: e.target.value }))} className="input">
                        <option value="employee">Employee</option>
                        <option value="manager">Manager</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-bridge-700 mb-1.5">Department</label>
                      <select value={newUser.department_id} onChange={e => setNewUser(u => ({ ...u, department_id: e.target.value }))} className="input">
                        <option value="">— None —</option>
                        {departments.map(d => <option key={d.id} value={d.id}>{d.display_name}</option>)}
                      </select>
                    </div>
                    {userError && <div className="col-span-2 text-red-600 text-sm">⚠ {userError}</div>}
                    <div className="col-span-2 flex gap-3 justify-end pt-1">
                      <button type="button" onClick={() => setShowUserForm(false)} className="btn-ghost">Cancel</button>
                      <button type="submit" disabled={userSaving} className="btn-primary">{userSaving ? 'Creating…' : 'Create User'}</button>
                    </div>
                  </form>
                </div>
              )}

              <div className="card overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-bridge-50 border-b border-bridge-100">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-bridge-500 uppercase tracking-wide">Name</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-bridge-500 uppercase tracking-wide">Email</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-bridge-500 uppercase tracking-wide">Role</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-bridge-500 uppercase tracking-wide">Department</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-bridge-500 uppercase tracking-wide">Status</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-bridge-50">
                    {users.map(u => (
                      <tr key={u.id} className={`hover:bg-bridge-50 transition-colors ${!u.is_active ? 'opacity-50' : ''}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-brand-500 flex items-center justify-center text-white text-xs font-bold">
                              {u.display_name[0]?.toUpperCase()}
                            </div>
                            <span className="font-medium text-bridge-900">{u.display_name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-bridge-600">{u.email}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                            u.role === 'admin' ? 'bg-purple-50 text-purple-700' :
                            u.role === 'manager' ? 'bg-brand-50 text-brand-600' :
                            'bg-bridge-100 text-bridge-600'
                          }`}>{u.role}</span>
                        </td>
                        <td className="px-4 py-3 text-bridge-500 text-xs">{u.department_display_name ?? '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-bridge-100 text-bridge-500'}`}>
                            {u.is_active ? '● Active' : '○ Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => toggleActive(u)} className="text-xs text-bridge-400 hover:text-bridge-700 transition-colors">
                            {u.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && <tr><td colSpan={6} className="text-center text-bridge-400 py-12 text-sm">No users yet.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ─── INVITES TAB ─── */}
          {tab === 'invites' && (
            <div>
              <div className="bg-brand-50 border border-brand-100 rounded-2xl p-4 mb-5 flex gap-3">
                <div className="text-brand-500 mt-0.5 flex-shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="text-sm text-brand-800">
                  Generate an invite link and share it with a teammate. They'll click it to create their account with the correct role and department. Links expire in 7 days.
                </div>
              </div>

              <div className="flex justify-end mb-4">
                <button onClick={() => setShowInviteForm(v => !v)} className="btn-primary flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Create Invite
                </button>
              </div>

              {showInviteForm && (
                <div className="card p-6 mb-5 ring-2 ring-brand-100 border-brand-200">
                  <h2 className="font-display font-bold text-bridge-900 mb-4">New Invite Link</h2>
                  <form onSubmit={handleCreateInvite} className="grid grid-cols-3 gap-4 items-end">
                    <div>
                      <label className="block text-sm font-medium text-bridge-700 mb-1.5">Email <span className="text-bridge-400">(optional)</span></label>
                      <input type="email" value={newInvite.email} onChange={e => setNewInvite(prev => ({ ...prev, email: e.target.value }))} className="input" placeholder="Leave blank for open invite" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-bridge-700 mb-1.5">Role</label>
                      <select value={newInvite.role} onChange={e => setNewInvite(prev => ({ ...prev, role: e.target.value }))} className="input">
                        <option value="employee">Employee</option>
                        <option value="manager">Manager</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-bridge-700 mb-1.5">Department</label>
                      <select value={newInvite.department_id} onChange={e => setNewInvite(prev => ({ ...prev, department_id: e.target.value }))} className="input">
                        <option value="">— None —</option>
                        {departments.map(d => <option key={d.id} value={d.id}>{d.display_name}</option>)}
                      </select>
                    </div>
                    {inviteError && <div className="col-span-3 text-red-600 text-sm">⚠ {inviteError}</div>}
                    <div className="col-span-3 flex gap-3 justify-end">
                      <button type="button" onClick={() => setShowInviteForm(false)} className="btn-ghost">Cancel</button>
                      <button type="submit" disabled={inviteSaving} className="btn-primary">{inviteSaving ? 'Generating…' : 'Generate Link'}</button>
                    </div>
                  </form>
                </div>
              )}

              {pendingInvites.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-xs font-semibold text-bridge-500 uppercase tracking-wide mb-2">Pending</h3>
                  <div className="space-y-2">
                    {pendingInvites.map(inv => (
                      <div key={inv.id} className="card p-4 flex items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-sm font-medium text-bridge-900">{inv.email ?? 'Open invite'}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                              inv.role === 'manager' ? 'bg-brand-50 text-brand-600' : 'bg-bridge-100 text-bridge-600'
                            }`}>{inv.role}</span>
                            {inv.department_name && <span className="text-xs text-bridge-400">{inv.department_name}</span>}
                          </div>
                          <div className="text-xs text-bridge-400">
                            Created {new Date(inv.created_at).toLocaleDateString()} · Expires {new Date(inv.expires_at).toLocaleDateString()}
                          </div>
                        </div>
                        <button
                          onClick={() => copyInviteLink(inv)}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            copiedToken === inv.id
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-brand-50 text-brand-600 hover:bg-brand-100'
                          }`}
                        >
                          {copiedToken === inv.id ? '✓ Copied!' : '🔗 Copy Link'}
                        </button>
                        <button onClick={() => revokeInvite(inv.id)} className="text-bridge-300 hover:text-red-500 transition-colors" title="Revoke">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {usedInvites.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-bridge-500 uppercase tracking-wide mb-2">Used</h3>
                  <div className="space-y-2">
                    {usedInvites.map(inv => (
                      <div key={inv.id} className="card p-4 flex items-center gap-4 opacity-60">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-bridge-700">{inv.email ?? 'Open invite'} → {inv.used_by_name}</div>
                          <div className="text-xs text-bridge-400">Used {new Date(inv.used_at!).toLocaleDateString()}</div>
                        </div>
                        <span className="text-xs px-2 py-0.5 bg-bridge-100 text-bridge-500 rounded-full">Used</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {invites.length === 0 && (
                <div className="text-center py-12 text-bridge-400 text-sm">No invites yet. Create one to add a teammate.</div>
              )}
            </div>
          )}

          {/* ─── COMPANY KNOWLEDGE TAB ─── */}
          {tab === 'company-knowledge' && (
            <div>
              <div className="flex justify-end mb-4">
                <button onClick={() => { setEditEntry(undefined); setShowKnowledgeForm(v => !v); }} className="btn-primary flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  New Company Entry
                </button>
              </div>
              {showKnowledgeForm && (
                <div className="card p-6 mb-5 ring-2 ring-brand-100 border-brand-200">
                  <h2 className="font-display font-bold text-bridge-900 mb-4">{editEntry ? 'Edit Entry' : 'New Company Knowledge Entry'}</h2>
                  <KnowledgeForm
                    departments={departments}
                    editEntry={editEntry}
                    defaultLayer="company"
                    onSaved={() => { setShowKnowledgeForm(false); setEditEntry(undefined); loadCompanyKnowledge(); }}
                    onCancel={() => { setShowKnowledgeForm(false); setEditEntry(undefined); }}
                  />
                </div>
              )}
              <KnowledgeList
                entries={companyEntries}
                onApprove={async id => { await api.post(`/api/knowledge/${id}/approve`, {}); loadCompanyKnowledge(); }}
                onArchive={async id => { if (confirm('Archive?')) { await api.post(`/api/knowledge/${id}/archive`, {}); loadCompanyKnowledge(); } }}
                onEdit={e => { setEditEntry(e); setShowKnowledgeForm(true); }}
                onDelete={async id => { if (confirm('Delete permanently?')) { await api.del(`/api/knowledge/${id}`); loadCompanyKnowledge(); } }}
              />
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
