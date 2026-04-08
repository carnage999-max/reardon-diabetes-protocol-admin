import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Activity, Eye, EyeOff } from 'lucide-react';
import { Spinner } from '../components/common/UI';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate   = useNavigate();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err?.response?.data?.error ?? err?.message ?? 'Login failed. Check credentials.');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg)' }}>
      {/* Ambient glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div style={{ position: 'absolute', top: '20%', left: '30%', width: 400, height: 400, background: 'radial-gradient(circle, rgba(0,212,255,0.06) 0%, transparent 70%)' }} />
        <div style={{ position: 'absolute', bottom: '20%', right: '30%', width: 320, height: 320, background: 'radial-gradient(circle, rgba(0,229,160,0.05) 0%, transparent 70%)' }} />
      </div>

      <div className="w-full max-w-sm relative">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8 gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: 'var(--cyan)', boxShadow: '0 0 32px rgba(0,212,255,0.4)' }}>
            <Activity size={22} color="#0A0E1A" strokeWidth={2.5} />
          </div>
          <div className="text-center">
            <h1 className="font-display text-xl font-bold" style={{ color: 'var(--text)' }}>Reardon Protocol</h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>Clinical Dashboard</p>
          </div>
        </div>

        {/* Card */}
        <div className="card p-6">
          <h2 className="font-display font-bold text-base mb-1" style={{ color: 'var(--text)' }}>Sign in</h2>
          <p className="text-xs mb-5" style={{ color: 'var(--muted)' }}>Clinician and admin accounts only.</p>

          <form onSubmit={submit} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>Email address</label>
              <input
                type="email" required autoFocus
                value={email} onChange={e => setEmail(e.target.value)}
                placeholder="clinician@reardon.com"
                className="input"
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'} required
                  value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input pr-10"
                />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }}>
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="px-3 py-2 rounded-lg text-xs" style={{ background: 'rgba(255,77,109,0.12)', color: '#FF4D6D', border: '1px solid rgba(255,77,109,0.25)' }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary flex items-center justify-center gap-2 mt-1">
              {loading ? <Spinner size={16} /> : null}
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: 'var(--faint)' }}>
          Protected patient data. Unauthorised access is prohibited.
        </p>
        <p className="text-center text-xs mt-2" style={{ color: 'var(--faint)' }}>
          First time? <a href="/setup" className="underline" style={{ color: 'var(--muted)' }}>Run initial setup</a>
        </p>
      </div>
    </div>
  );
}
