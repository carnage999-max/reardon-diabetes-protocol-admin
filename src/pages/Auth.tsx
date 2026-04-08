import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/ctx';
import { authApi, clinicsApi } from '../services/api';
import { Spin, Field } from '../components/common/UI';
import { Activity, Eye, EyeOff, ChevronRight, Check, Copy } from 'lucide-react';
import { slugify } from '../utils/helpers';
import logo from '../assets/logo.jpeg';

// ── Login ─────────────────────────────────────────────────────
export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');


  const submit = async (e: FormEvent) => {
    e.preventDefault(); setErr(''); setBusy(true);
    try { await login(email, pw); navigate('/'); }
    catch (ex: any) {
      const msg = ex?.response?.data?.error ?? ex?.message ?? 'Login failed';
      setErr(msg.includes('staff') ? 'Access restricted to clinicians and administrators only.' : msg);
    } finally { setBusy(false); }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'var(--bg)' }}>
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '20%', left: '30%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle,rgba(0,191,224,0.045) 0%,transparent 70%)' }} />
        <div style={{ position: 'absolute', bottom: '20%', right: '25%', width: 320, height: 320, borderRadius: '50%', background: 'radial-gradient(circle,rgba(0,200,122,0.035) 0%,transparent 70%)' }} />
      </div>
      <div style={{ width: '100%', maxWidth: 370, position: 'relative' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 11, marginBottom: 26 }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, background: 'var(--cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 26px rgba(0,191,224,0.32)' }}>
            <img src={logo} alt="Reardon Protocol" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 14 }} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ fontFamily: 'Syne,sans-serif', fontSize: 19, fontWeight: 700, color: 'var(--text)' }}>Reardon Protocol</h1>
            <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>Clinical Dashboard — Authorised Staff Only</p>
          </div>
        </div>
        <div className="card" style={{ padding: 22 }}>
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
            <Field label="Email address">
              <input type="email" required className="inp" placeholder="clinician@reardon.com" value={email} onChange={e => setEmail(e.target.value)} />
            </Field>
            <Field label="Password">
              <div style={{ position: 'relative' }}>
                <input type={show ? 'text' : 'password'} required className="inp" placeholder="••••••••" value={pw} onChange={e => setPw(e.target.value)} style={{ paddingRight: 34 }} />
                <button type="button" onClick={() => setShow(v => !v)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}>
                  {show ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
            </Field>
            {err && <div style={{ padding: '7px 11px', borderRadius: 7, background: 'var(--rose-bg)', border: '1px solid rgba(232,64,96,0.22)', fontSize: 12, color: 'var(--rose)' }}>{err}</div>}
            <button type="submit" disabled={busy} className="btn btn-primary" style={{ marginTop: 2 }}>
              {busy && <Spin size={14} />} {busy ? 'Signing in…' : 'Sign In'} {!busy && <ChevronRight size={13} />}
            </button>
          </form>
        </div>
        <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--faint)', marginTop: 14 }}>
          First time?{' '}
          <a href="/setup" style={{ color: 'var(--muted)', textDecoration: 'underline' }}>Run initial setup</a>
        </p>
      </div>
    </div>
  );
}

// ── Setup wizard ─────────────────────────────────────────────
type Step = 'admin' | 'clinic' | 'clinician' | 'done';
const STEPS: { id: Step; label: string }[] = [
  { id: 'admin', label: 'Admin Account' },
  { id: 'clinic', label: 'Create Clinic' },
  { id: 'clinician', label: 'Add Clinician' },
  { id: 'done', label: 'Ready' },
];

function StepBar({ current }: { current: Step }) {
  const idx = STEPS.findIndex(s => s.id === current);
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
      {STEPS.map((s, i) => {
        const done = i < idx, active = i === idx;
        return (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 26, height: 26, borderRadius: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, background: done ? 'var(--green)' : active ? 'var(--cyan-bg)' : 'var(--faint)', color: done ? '#030810' : active ? 'var(--cyan)' : 'var(--muted)', border: active ? '1.5px solid var(--cyan)' : 'none', transition: 'all 0.2s' }}>
                {done ? <Check size={12} /> : i + 1}
              </div>
              <span style={{ fontSize: 10, color: active ? 'var(--text)' : 'var(--muted)', fontWeight: active ? 600 : 400, whiteSpace: 'nowrap' }}>{s.label}</span>
            </div>
            {i < STEPS.length - 1 && <div style={{ width: 36, height: 1, background: i < idx ? 'var(--green)' : 'var(--faint)', marginBottom: 14, flexShrink: 0, margin: '0 4px 14px 4px' }} />}
          </div>
        );
      })}
    </div>
  );
}

export function SetupPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('admin');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPw, setAdminPw] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [showPw, setShowPw] = useState(false);

  const [admin, setAdmin] = useState({ firstName: '', lastName: '', email: '', pw: '', confirm: '' });
  const [clinic, setClinic] = useState({ name: '', slug: '' });
  const [clin, setClin] = useState({ firstName: '', lastName: '', email: '', pw: '' });

  const copy = () => { navigator.clipboard.writeText(inviteCode); setCopied(true); setTimeout(() => setCopied(false), 2200); };

  // Step 1: Register admin (no invite code — they'll get clinic_id after step 2)
  const createAdmin = async (e: FormEvent) => {
    e.preventDefault();
    if (admin.pw !== admin.confirm) { setErr('Passwords do not match.'); return; }
    if (admin.pw.length < 8) { setErr('Password must be at least 8 characters.'); return; }
    setBusy(true); setErr('');
    try {
      const { data } = await authApi.register({
        email: admin.email.trim(), password: admin.pw,
        role: 'ADMIN', first_name: admin.firstName.trim(), last_name: admin.lastName.trim(),
      });
      // Store credentials for re-login after clinic creation
      setAdminEmail(admin.email.trim());
      setAdminPw(admin.pw);
      localStorage.setItem('rp_token', data.data.access_token);
      localStorage.setItem('rp_refresh', data.data.refresh_token);
      setStep('clinic');
    } catch (ex: any) {
      const code = ex?.response?.data?.code ?? '';
      setErr(code === 'EMAIL_TAKEN' ? 'An account with this email already exists. Go to /login instead.' : (ex?.response?.data?.error ?? 'Registration failed.'));
    } finally { setBusy(false); }
  };

  // Step 2: Create clinic — backend also sets admin's clinic_id in DB
  // We then re-login so the new JWT includes the clinic_id
  const createClinic = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true); setErr('');
    try {
      const { data } = await clinicsApi.create(clinic.name.trim(), clinic.slug.trim());
      const code = data.data.invite_code ?? '';
      setInviteCode(code);

      // CRITICAL: Re-login to get a fresh JWT that includes clinic_id
      // The createClinic backend call set clinic_id on the admin user,
      // but the current token still has clinic_id = null.
      const loginRes = await authApi.login(adminEmail, adminPw);
      localStorage.setItem('rp_token', loginRes.data.data.access_token);
      localStorage.setItem('rp_refresh', loginRes.data.data.refresh_token);

      setStep('clinician');
    } catch (ex: any) {
      const code = ex?.response?.data?.code ?? '';
      setErr(code === 'SLUG_TAKEN' ? 'That slug is already taken. Try a different one.' : (ex?.response?.data?.error ?? 'Failed to create clinic.'));
    } finally { setBusy(false); }
  };

  // Step 3: Create clinician (optional) — uses invite code so they get the clinic_id
  const createClinician = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true); setErr('');
    try {
      await authApi.register({
        email: clin.email.trim(), password: clin.pw,
        role: 'CLINICIAN', first_name: clin.firstName.trim(), last_name: clin.lastName.trim(),
        invite_code: inviteCode,
      });
      setStep('done');
    } catch (ex: any) {
      setErr(ex?.response?.data?.error ?? 'Failed to create clinician account.');
    } finally { setBusy(false); }
  };

  const inp = (label: string, val: string, set: (v: string) => void, opts?: any) => (
    <Field label={label}><input className="inp" value={val} onChange={e => set(e.target.value)} {...opts} /></Field>
  );

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'var(--bg)' }}>
      <div style={{ width: '100%', maxWidth: 450, position: 'relative' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <div style={{ width: 42, height: 42, borderRadius: 13, background: 'var(--cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 22px rgba(0,191,224,0.3)' }}>
            <Activity size={18} color="#030810" strokeWidth={2.5} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ fontFamily: 'Syne,sans-serif', fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>Initial Setup</h1>
            <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>Configure your Reardon Protocol clinic</p>
          </div>
        </div>

        <StepBar current={step} />

        {/* Step 1: Admin */}
        {step === 'admin' && (
          <div className="card page" style={{ padding: 22 }}>
            <p style={{ fontFamily: 'Syne,sans-serif', fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 3 }}>Create your admin account</p>
            <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>You will be the administrator of your clinic.</p>
            <form onSubmit={createAdmin} style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
                {inp('First name', admin.firstName, v => setAdmin(a => ({ ...a, firstName: v })), { required: true, placeholder: 'Nathan' })}
                {inp('Last name', admin.lastName, v => setAdmin(a => ({ ...a, lastName: v })), { required: true, placeholder: 'Reardon' })}
              </div>
              {inp('Email address', admin.email, v => setAdmin(a => ({ ...a, email: v })), { type: 'email', required: true, placeholder: 'admin@yourclinic.com' })}
              <Field label="Password (min 8 chars)">
                <div style={{ position: 'relative' }}>
                  <input type={showPw ? 'text' : 'password'} required className="inp" placeholder="••••••••" value={admin.pw} onChange={e => setAdmin(a => ({ ...a, pw: e.target.value }))} style={{ paddingRight: 34 }} />
                  <button type="button" onClick={() => setShowPw(v => !v)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}>{showPw ? <EyeOff size={12} /> : <Eye size={12} />}</button>
                </div>
              </Field>
              {inp('Confirm password', admin.confirm, v => setAdmin(a => ({ ...a, confirm: v })), { type: 'password', required: true, placeholder: '••••••••' })}
              {err && <p style={{ fontSize: 11, color: 'var(--rose)', padding: '6px 10px', borderRadius: 7, background: 'var(--rose-bg)' }}>{err}</p>}
              <button type="submit" disabled={busy} className="btn btn-primary" style={{ marginTop: 3 }}>
                {busy && <Spin size={13} />} {busy ? 'Creating…' : 'Create Admin Account'} {!busy && <ChevronRight size={13} />}
              </button>
            </form>
          </div>
        )}

        {/* Step 2: Clinic */}
        {step === 'clinic' && (
          <div className="card page" style={{ padding: 22 }}>
            <span className="badge b-green" style={{ marginBottom: 12, display: 'inline-flex' }}>Admin account created ✓</span>
            <p style={{ fontFamily: 'Syne,sans-serif', fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 3 }}>Create your clinic</p>
            <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>Your admin account will be linked to this clinic. Clinicians and patients join using the invite code.</p>
            <form onSubmit={createClinic} style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
              <Field label="Clinic name *">
                <input required className="inp" placeholder="e.g. Reardon Protocol Dubai" value={clinic.name}
                  onChange={e => { const n = e.target.value; setClinic({ name: n, slug: slugify(n) }); }} />
              </Field>
              <Field label="Slug (URL-safe, auto-generated)">
                <input required className="inp" placeholder="reardon-protocol-dubai" value={clinic.slug}
                  onChange={e => setClinic(v => ({ ...v, slug: slugify(e.target.value) }))}
                  style={{ fontFamily: 'JetBrains Mono', fontSize: 12 }} />
              </Field>
              {err && <p style={{ fontSize: 11, color: 'var(--rose)', padding: '6px 10px', borderRadius: 7, background: 'var(--rose-bg)' }}>{err}</p>}
              <button type="submit" disabled={busy} className="btn btn-primary" style={{ marginTop: 3 }}>
                {busy && <Spin size={13} />} {busy ? 'Creating clinic…' : 'Create Clinic'} {!busy && <ChevronRight size={13} />}
              </button>
            </form>
          </div>
        )}

        {/* Step 3: Clinician */}
        {step === 'clinician' && (
          <div className="card page" style={{ padding: 22 }}>
            <span className="badge b-green" style={{ marginBottom: 10, display: 'inline-flex' }}>Clinic created ✓</span>
            <div style={{ padding: '11px 13px', borderRadius: 9, background: 'var(--s2)', border: '1px solid rgba(232,160,0,0.28)', marginBottom: 16 }}>
              <p style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 4 }}>Your clinic invite code — save this</p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <code style={{ fontFamily: 'JetBrains Mono', fontSize: 20, fontWeight: 700, color: 'var(--amber)', letterSpacing: '0.12em' }}>{inviteCode}</code>
                <button onClick={copy} className="btn btn-ghost btn-sm">{copied ? <Check size={11} /> : <Copy size={11} />}{copied ? 'Copied' : 'Copy'}</button>
              </div>
              <p style={{ fontSize: 10, color: 'var(--faint)', marginTop: 5 }}>Clinicians and patients use this code when registering to join your clinic.</p>
            </div>
            <p style={{ fontFamily: 'Syne,sans-serif', fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 3 }}>
              Add a clinician <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--muted)' }}>(optional)</span>
            </p>
            <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14 }}>You can add clinicians now or later from the Clinic page.</p>
            <form onSubmit={createClinician} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {inp('First name', clin.firstName, v => setClin(c => ({ ...c, firstName: v })), { placeholder: 'Dr. Sarah' })}
                {inp('Last name', clin.lastName, v => setClin(c => ({ ...c, lastName: v })), { placeholder: 'Smith' })}
              </div>
              {inp('Email', clin.email, v => setClin(c => ({ ...c, email: v })), { type: 'email', placeholder: 'dr.smith@clinic.com' })}
              {inp('Password (min 8)', clin.pw, v => setClin(c => ({ ...c, pw: v })), { type: 'password', placeholder: '••••••••' })}
              {err && <p style={{ fontSize: 11, color: 'var(--rose)', padding: '6px 10px', borderRadius: 7, background: 'var(--rose-bg)' }}>{err}</p>}
              <div style={{ display: 'flex', gap: 8, marginTop: 3 }}>
                <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setStep('done')}>Skip for now</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={busy || !clin.email || !clin.pw}>
                  {busy && <Spin size={13} />}{busy ? 'Adding…' : 'Add Clinician'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Done */}
        {step === 'done' && (
          <div className="card page" style={{ padding: 26, textAlign: 'center' }}>
            <div style={{ width: 52, height: 52, borderRadius: 26, background: 'var(--green-bg)', border: '2px solid var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', boxShadow: '0 0 18px rgba(0,200,122,0.18)' }}>
              <Check size={22} color="var(--green)" />
            </div>
            <p style={{ fontFamily: 'Syne,sans-serif', fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>Setup complete</p>
            <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.65, marginBottom: 18 }}>
              Your clinic is ready. Sign in with your admin account to get started.
            </p>
            {inviteCode && (
              <div style={{ padding: '10px 13px', borderRadius: 9, background: 'var(--s2)', border: '1px solid var(--border)', marginBottom: 16, textAlign: 'left' }}>
                <p style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 4 }}>Clinic invite code</p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <code style={{ fontFamily: 'JetBrains Mono', fontSize: 16, fontWeight: 700, color: 'var(--amber)', letterSpacing: '0.1em' }}>{inviteCode}</code>
                  <button onClick={copy} className="btn btn-ghost btn-sm">{copied ? <Check size={11} /> : <Copy size={11} />}</button>
                </div>
              </div>
            )}
            <button onClick={() => navigate('/login')} className="btn btn-primary" style={{ width: '100%' }}>
              Go to Sign In <ChevronRight size={13} />
            </button>
          </div>
        )}

        <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--faint)', marginTop: 13 }}>
          Already set up? <a href="/login" style={{ color: 'var(--muted)', textDecoration: 'underline' }}>Sign in</a>
        </p>
      </div>
    </div>
  );
}
