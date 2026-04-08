import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Spinner } from '../components/common/UI';
import { Activity, Check, ChevronRight, Eye, EyeOff, Copy } from 'lucide-react';

type Step = 'admin' | 'clinic' | 'clinician' | 'done';

interface StepInfo { id: Step; label: string; description: string }
const STEPS: StepInfo[] = [
  { id: 'admin',     label: 'Admin account',    description: 'Create the first administrator' },
  { id: 'clinic',    label: 'Create clinic',     description: 'Set up your clinic' },
  { id: 'clinician', label: 'Add clinician',     description: 'Optional — add a clinician now' },
  { id: 'done',      label: 'Ready',             description: 'Dashboard is ready to use' },
];

function StepBar({ current }: { current: Step }) {
  const idx = STEPS.findIndex(s => s.id === current);
  return (
    <div className="flex items-center gap-0 mb-10">
      {STEPS.map((s, i) => {
        const done    = i < idx;
        const active  = i === idx;
        const pending = i > idx;
        return (
          <div key={s.id} className="flex items-center gap-0">
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                done   ? 'bg-emerald-500 text-white' :
                active ? 'border-2 text-cyan-400 border-cyan-400' :
                         'border border-slate-600 text-slate-500'
              }`}
                style={done ? { background: 'var(--emerald)' } : active ? { borderColor: 'var(--cyan)', color: 'var(--cyan)' } : { borderColor: 'var(--faint)', color: 'var(--muted)' }}>
                {done ? <Check size={14} /> : i + 1}
              </div>
              <p className="text-xs mt-1.5 text-center w-20" style={{ color: active ? 'var(--text)' : 'var(--muted)', fontWeight: active ? 600 : 400 }}>
                {s.label}
              </p>
            </div>
            {i < STEPS.length - 1 && (
              <div className="w-16 h-px mb-5 mx-1" style={{ background: done ? 'var(--emerald)' : 'var(--faint)' }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function SetupPage() {
  const navigate = useNavigate();
  const [step,    setStep]    = useState<Step>('admin');
  const [adminToken, setAdminToken] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [showPw,  setShowPw]  = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [copied,  setCopied]  = useState(false);

  // Admin form
  const [admin, setAdmin] = useState({
    email: '', password: '', confirm: '', first_name: '', last_name: '',
  });

  // Clinic form
  const [clinic, setClinic] = useState({ name: '', slug: '' });

  // Clinician form
  const [clinician, setClinician] = useState({
    email: '', password: '', first_name: '', last_name: '',
  });

  const autoSlug = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').slice(0, 60);

  // ── Step 1: Create admin ─────────────────────────────────────
  const createAdmin = async (e: FormEvent) => {
    e.preventDefault();
    if (admin.password !== admin.confirm) { setError('Passwords do not match.'); return; }
    if (admin.password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setLoading(true); setError('');
    try {
      const { data } = await api.post('/auth/register', {
        email:      admin.email.trim(),
        password:   admin.password,
        role:       'ADMIN',
        first_name: admin.first_name.trim(),
        last_name:  admin.last_name.trim(),
      });
      // Store token for clinic creation
      const token = data.data.access_token;
      setAdminToken(token);
      localStorage.setItem('rp_access_token',  token);
      localStorage.setItem('rp_refresh_token', data.data.refresh_token);
      setStep('clinic');
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? err?.response?.data?.code ?? 'Registration failed.';
      if (msg.includes('EMAIL_TAKEN') || msg.includes('already')) {
        setError('An account with this email already exists. If you already have an admin account, go to /login instead.');
      } else {
        setError(msg);
      }
    } finally { setLoading(false); }
  };

  // ── Step 2: Create clinic ────────────────────────────────────
  const createClinic = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const { data } = await api.post('/clinics', {
        name: clinic.name.trim(),
        slug: clinic.slug.trim(),
      });
      setInviteCode(data.data.invite_code ?? '');
      setStep('clinician');
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? 'Failed to create clinic.';
      setError(msg.includes('SLUG_TAKEN') ? 'That clinic slug is already taken. Try a different one.' : msg);
    } finally { setLoading(false); }
  };

  // ── Step 3: Create clinician (optional) ──────────────────────
  const createClinician = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await api.post('/auth/register', {
        email:       clinician.email.trim(),
        password:    clinician.password,
        role:        'CLINICIAN',
        first_name:  clinician.first_name.trim(),
        last_name:   clinician.last_name.trim(),
        invite_code: inviteCode,
      });
      setStep('done');
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Failed to create clinician account.');
    } finally { setLoading(false); }
  };

  const copyInvite = () => {
    navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--bg)' }}>
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div style={{ position: 'absolute', top: '15%', left: '25%', width: 500, height: 500, background: 'radial-gradient(circle, rgba(0,212,255,0.05) 0%, transparent 70%)' }} />
        <div style={{ position: 'absolute', bottom: '15%', right: '25%', width: 400, height: 400, background: 'radial-gradient(circle, rgba(0,229,160,0.04) 0%, transparent 70%)' }} />
      </div>

      <div className="w-full max-w-lg relative">
        {/* Header */}
        <div className="flex flex-col items-center mb-8 gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: 'var(--cyan)', boxShadow: '0 0 32px rgba(0,212,255,0.4)' }}>
            <Activity size={22} color="#0A0E1A" strokeWidth={2.5} />
          </div>
          <div className="text-center">
            <h1 className="font-display text-2xl font-bold" style={{ color: 'var(--text)' }}>Initial Setup</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>Configure your Reardon Protocol® instance</p>
          </div>
        </div>

        <StepBar current={step} />

        {/* ── Step 1: Admin ─────────────────────────────────── */}
        {step === 'admin' && (
          <div className="card p-6">
            <h2 className="font-display font-bold text-base mb-1" style={{ color: 'var(--text)' }}>Create administrator account</h2>
            <p className="text-xs mb-5" style={{ color: 'var(--muted)' }}>This will be the master admin account for your deployment.</p>
            <form onSubmit={createAdmin} className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>First name</label>
                  <input className="input" placeholder="e.g. Reardon" required value={admin.first_name} onChange={e => setAdmin(v => ({ ...v, first_name: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Last name</label>
                  <input className="input" placeholder="e.g. Admin" required value={admin.last_name} onChange={e => setAdmin(v => ({ ...v, last_name: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Email address</label>
                <input type="email" className="input" placeholder="admin@reardonprotocol.com" required value={admin.email} onChange={e => setAdmin(v => ({ ...v, email: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Password <span style={{ color: 'var(--faint)' }}>(min 8 characters)</span></label>
                <div className="relative">
                  <input type={showPw ? 'text' : 'password'} className="input pr-10" placeholder="••••••••••" required value={admin.password} onChange={e => setAdmin(v => ({ ...v, password: e.target.value }))} />
                  <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }}>
                    {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Confirm password</label>
                <input type="password" className="input" placeholder="••••••••••" required value={admin.confirm} onChange={e => setAdmin(v => ({ ...v, confirm: e.target.value }))} />
              </div>
              {error && <p className="text-xs px-3 py-2 rounded-lg" style={{ background: 'rgba(255,77,109,0.1)', color: 'var(--rose)', border: '1px solid rgba(255,77,109,0.2)' }}>{error}</p>}
              <button type="submit" disabled={loading} className="btn-primary flex items-center justify-center gap-2 mt-1">
                {loading ? <Spinner size={15} /> : null}
                {loading ? 'Creating account…' : 'Create Admin Account'}
                {!loading && <ChevronRight size={15} />}
              </button>
            </form>
          </div>
        )}

        {/* ── Step 2: Clinic ────────────────────────────────── */}
        {step === 'clinic' && (
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-1">
              <span className="badge-ok">Admin created ✓</span>
            </div>
            <h2 className="font-display font-bold text-base mt-2 mb-1" style={{ color: 'var(--text)' }}>Create your clinic</h2>
            <p className="text-xs mb-5" style={{ color: 'var(--muted)' }}>Patients and clinicians join your clinic using an invite code.</p>
            <form onSubmit={createClinic} className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Clinic name</label>
                <input className="input" placeholder="e.g. Reardon Protocol Dubai" required value={clinic.name}
                  onChange={e => {
                    const name = e.target.value;
                    setClinic(v => ({ ...v, name, slug: autoSlug(name) }));
                  }} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>
                  Clinic slug <span style={{ color: 'var(--faint)' }}>(URL-safe identifier, auto-generated)</span>
                </label>
                <input className="input font-mono text-sm" placeholder="e.g. reardon-protocol-dubai" required value={clinic.slug}
                  onChange={e => setClinic(v => ({ ...v, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') }))} />
                <p className="text-xs mt-1" style={{ color: 'var(--faint)' }}>Lowercase letters, numbers and hyphens only.</p>
              </div>
              {error && <p className="text-xs px-3 py-2 rounded-lg" style={{ background: 'rgba(255,77,109,0.1)', color: 'var(--rose)', border: '1px solid rgba(255,77,109,0.2)' }}>{error}</p>}
              <button type="submit" disabled={loading} className="btn-primary flex items-center justify-center gap-2 mt-1">
                {loading ? <Spinner size={15} /> : null}
                {loading ? 'Creating clinic…' : 'Create Clinic'}
                {!loading && <ChevronRight size={15} />}
              </button>
            </form>
          </div>
        )}

        {/* ── Step 3: Clinician ─────────────────────────────── */}
        {step === 'clinician' && (
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="badge-ok">Clinic created ✓</span>
            </div>

            {/* Show invite code */}
            <div className="p-4 rounded-xl mb-5" style={{ background: 'var(--surface2)', border: '1px solid rgba(255,184,0,0.3)' }}>
              <p className="text-xs font-semibold mb-1" style={{ color: 'var(--muted)' }}>Your clinic invite code</p>
              <div className="flex items-center justify-between">
                <code className="font-mono text-2xl font-bold tracking-widest" style={{ color: 'var(--amber)' }}>{inviteCode}</code>
                <button onClick={copyInvite} className="btn-ghost text-xs flex items-center gap-1.5 py-1.5">
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <p className="text-xs mt-2" style={{ color: 'var(--faint)' }}>Share this with patients and clinicians to join your clinic. You can find it later in Clinic settings.</p>
            </div>

            <h2 className="font-display font-bold text-base mb-1" style={{ color: 'var(--text)' }}>Add a clinician <span className="font-normal text-sm" style={{ color: 'var(--muted)' }}>(optional)</span></h2>
            <p className="text-xs mb-4" style={{ color: 'var(--muted)' }}>Create a clinician account now, or skip and do it later from the dashboard.</p>

            <form onSubmit={createClinician} className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>First name</label>
                  <input className="input" placeholder="e.g. Sarah" value={clinician.first_name} onChange={e => setClinician(v => ({ ...v, first_name: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Last name</label>
                  <input className="input" placeholder="e.g. Smith" value={clinician.last_name} onChange={e => setClinician(v => ({ ...v, last_name: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Email address</label>
                <input type="email" className="input" placeholder="dr.smith@clinic.com" value={clinician.email} onChange={e => setClinician(v => ({ ...v, email: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Password</label>
                <input type="password" className="input" placeholder="••••••••" value={clinician.password} onChange={e => setClinician(v => ({ ...v, password: e.target.value }))} />
              </div>
              {error && <p className="text-xs px-3 py-2 rounded-lg" style={{ background: 'rgba(255,77,109,0.1)', color: 'var(--rose)', border: '1px solid rgba(255,77,109,0.2)' }}>{error}</p>}
              <div className="flex gap-2 mt-1">
                <button type="button" onClick={() => setStep('done')} className="btn-ghost flex-1">
                  Skip for now
                </button>
                <button type="submit"
                  disabled={loading || !clinician.email || !clinician.password || !clinician.first_name}
                  className="btn-primary flex-1 flex items-center justify-center gap-2">
                  {loading ? <Spinner size={15} /> : null}
                  {loading ? 'Creating…' : 'Add Clinician'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── Step 4: Done ─────────────────────────────────── */}
        {step === 'done' && (
          <div className="card p-6 text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: 'rgba(0,229,160,0.15)', border: '2px solid var(--emerald)', boxShadow: '0 0 24px rgba(0,229,160,0.2)' }}>
              <Check size={28} style={{ color: 'var(--emerald)' }} />
            </div>
            <h2 className="font-display font-bold text-xl mb-2" style={{ color: 'var(--text)' }}>Setup complete</h2>
            <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>
              Your Reardon Protocol dashboard is ready. Sign in with your admin account to get started.
            </p>

            {inviteCode && (
              <div className="p-3 rounded-xl mb-5 text-left" style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                <p className="text-xs mb-1" style={{ color: 'var(--muted)' }}>Clinic invite code — save this somewhere safe</p>
                <div className="flex items-center justify-between">
                  <code className="font-mono font-bold tracking-widest" style={{ color: 'var(--amber)' }}>{inviteCode}</code>
                  <button onClick={copyInvite} className="btn-ghost text-xs flex items-center gap-1.5 py-1">
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <button onClick={() => navigate('/login')} className="btn-primary flex items-center justify-center gap-2">
                Go to Sign In <ChevronRight size={15} />
              </button>
              <p className="text-xs" style={{ color: 'var(--faint)' }}>
                Use your admin email and password to log in
              </p>
            </div>
          </div>
        )}

        <p className="text-center text-xs mt-6" style={{ color: 'var(--faint)' }}>
          Already set up? <button onClick={() => navigate('/login')} className="underline" style={{ color: 'var(--muted)' }}>Sign in instead</button>
        </p>
      </div>
    </div>
  );
}
