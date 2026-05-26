import { useState, useEffect, FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';

interface InviteInfo {
  email: string | null;
  role: string;
  department: string | null;
  expires_at: string;
}

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    fetch(`/api/invites/validate/${token}`, { credentials: 'include' })
      .then(r => r.ok ? r.json() as Promise<InviteInfo> : Promise.reject())
      .then(data => {
        setInvite(data);
        if (data.email) setEmail(data.email);
      })
      .catch(() => setNotFound(true));
  }, [token]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`/api/invites/accept/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password, display_name: displayName }),
      });
      if (!res.ok) {
        const body = await res.json() as { error?: string };
        throw new Error(body.error ?? 'Failed to create account');
      }
      navigate('/chat');
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (notFound) {
    return (
      <div className="min-h-screen bg-bridge-50 flex items-center justify-center p-4">
        <div className="card p-10 max-w-md w-full text-center">
          <div className="text-4xl mb-4">🔗</div>
          <h1 className="font-display text-xl font-bold text-bridge-900 mb-2">Invite Not Found</h1>
          <p className="text-bridge-500 text-sm mb-6">This invite link has expired or already been used.</p>
          <button onClick={() => navigate('/login')} className="btn-primary">Back to Login</button>
        </div>
      </div>
    );
  }

  if (!invite) {
    return (
      <div className="min-h-screen bg-bridge-50 flex items-center justify-center">
        <div className="text-bridge-400 text-sm">Loading invite…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-bridge-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-brand-100 opacity-40 blur-3xl" />
      </div>
      <div className="w-full max-w-md relative z-10">
        <div className="flex justify-center mb-8">
          <Logo size="md" />
        </div>

        <div className="card p-8 shadow-lift">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 bg-brand-50 text-brand-600 text-xs font-medium px-3 py-1.5 rounded-full border border-brand-100 mb-3">
              You've been invited to join as <strong className="capitalize">{invite.role}</strong>
              {invite.department && <> · {invite.department}</>}
            </div>
            <h1 className="font-display text-2xl font-bold text-bridge-900">Create your account</h1>
            <p className="text-sm text-bridge-500 mt-1">Set up your Five Star AI Workspace access</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-bridge-700 mb-1.5">Your full name</label>
              <input value={displayName} onChange={e => setDisplayName(e.target.value)} required className="input" placeholder="Jane Smith" />
            </div>
            <div>
              <label className="block text-sm font-medium text-bridge-700 mb-1.5">Email address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                readOnly={!!invite.email}
                className={`input ${invite.email ? 'bg-bridge-50 text-bridge-500 cursor-not-allowed' : ''}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-bridge-700 mb-1.5">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} className="input" placeholder="At least 8 characters" />
            </div>
            <div>
              <label className="block text-sm font-medium text-bridge-700 mb-1.5">Confirm password</label>
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required className="input" />
            </div>

            {error && (
              <div className="flex items-start gap-2 text-red-600 text-sm bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">
                <span>⚠ {error}</span>
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Creating account…' : 'Create account & sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
