import { useState, FormEvent } from 'react';
import { api } from '../api';
import { KnowledgeEntry, Department } from '../types';
import { useAuth } from '../context/AuthContext';

interface Props {
  departments: Department[];
  onSaved: (entry: KnowledgeEntry) => void;
  onCancel: () => void;
  editEntry?: KnowledgeEntry;
  defaultLayer?: 'company' | 'department';
}

const layerOptions = [
  { value: 'department', label: 'Department', desc: 'Visible to your department only', icon: '📋' },
  { value: 'company',    label: 'Company-Wide', desc: 'Visible to all employees', icon: '🏢' },
];

export default function KnowledgeForm({ departments, onSaved, onCancel, editEntry, defaultLayer = 'department' }: Props) {
  const { user } = useAuth();
  const [title, setTitle] = useState(editEntry?.title ?? '');
  const [content, setContent] = useState(editEntry?.content ?? '');
  const [layer, setLayer] = useState<'company' | 'department'>(
    editEntry?.layer === 'company' ? 'company' : defaultLayer
  );
  const [deptId, setDeptId] = useState<number | null>(editEntry?.department_id ?? user?.department_id ?? null);
  const [tags, setTagsStr] = useState((editEntry?.tags ? (JSON.parse(editEntry.tags) as string[]).join(', ') : ''));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setSaving(true);
    setError('');
    const tagList = tags.split(',').map(t => t.trim()).filter(Boolean);
    try {
      let entry: KnowledgeEntry;
      if (editEntry) {
        entry = await api.put<KnowledgeEntry>(`/api/knowledge/${editEntry.id}`, { title, content, tags: tagList });
      } else {
        entry = await api.post<KnowledgeEntry>('/api/knowledge', {
          layer,
          title,
          content,
          tags: tagList,
          department_id: layer === 'department' ? deptId : null
        });
      }
      onSaved(entry);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Layer selector (not shown when editing or for non-admin creating dept entry) */}
      {!editEntry && user?.role === 'admin' && (
        <div>
          <label className="block text-sm font-medium text-bridge-700 mb-2">Knowledge layer</label>
          <div className="grid grid-cols-2 gap-2">
            {layerOptions.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setLayer(opt.value as 'company' | 'department')}
                className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                  layer === opt.value
                    ? 'border-brand-400 bg-brand-50 ring-2 ring-brand-200'
                    : 'border-bridge-200 bg-white hover:border-bridge-300'
                }`}
              >
                <span className="text-xl mt-0.5">{opt.icon}</span>
                <div>
                  <div className="text-sm font-semibold text-bridge-900">{opt.label}</div>
                  <div className="text-xs text-bridge-500">{opt.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Department selector (admin only) */}
      {!editEntry && layer === 'department' && user?.role === 'admin' && departments.length > 1 && (
        <div>
          <label className="block text-sm font-medium text-bridge-700 mb-1.5">Department</label>
          <select
            value={deptId ?? ''}
            onChange={e => setDeptId(parseInt(e.target.value, 10))}
            className="input"
          >
            {departments.map(d => <option key={d.id} value={d.id}>{d.display_name}</option>)}
          </select>
        </div>
      )}

      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-bridge-700 mb-1.5">Title</label>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          required
          className="input"
          placeholder="e.g. Five-Panel Folder Quoting Rules"
        />
      </div>

      {/* Content */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-sm font-medium text-bridge-700">Content</label>
          <span className="text-xs text-bridge-400">Be specific — this is what the AI uses when answering questions</span>
        </div>
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          required
          rows={12}
          className="input font-mono text-xs resize-y"
          placeholder={`Write the rules, guidelines, or reference information here.\n\nExample:\n- When quoting a five-panel folder, always check score-to-score dimensions\n- Flute direction must run parallel to the score\n- Minimum order: 500 units for litho label, 250 for direct print`}
        />
      </div>

      {/* Tags */}
      <div>
        <label className="block text-sm font-medium text-bridge-700 mb-1.5">
          Tags <span className="text-bridge-400 font-normal">(optional, comma-separated)</span>
        </label>
        <input
          value={tags}
          onChange={e => setTagsStr(e.target.value)}
          className="input"
          placeholder="e.g. quoting, five-panel, display boxes"
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">
          <span>⚠ {error}</span>
        </div>
      )}

      <div className="flex gap-3 justify-end pt-1">
        <button type="button" onClick={onCancel} className="btn-ghost">Cancel</button>
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Saving…
            </span>
          ) : editEntry ? 'Save Changes' : 'Create Draft'}
        </button>
      </div>
    </form>
  );
}
