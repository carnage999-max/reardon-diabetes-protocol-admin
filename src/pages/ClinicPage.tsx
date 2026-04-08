import { useState, useEffect } from 'react';
import { useAuth, useClinic } from '../hooks/ctx';
import { clinicsApi, authApi } from '../services/api';
import { ago, fmtDate, slugify } from '../utils/helpers';
import { PageLoad, Empty, Modal, Toast, Spin, Field } from '../components/common/UI';
import { Building2, Key, RefreshCw, Copy, Check, Plus, Users, Shield } from 'lucide-react';

export default function ClinicPage() {
  const { user }                       = useAuth();
  const { clinicId, clinic, refreshClinic } = useClinic();
  const isAdmin                         = user?.role === 'ADMIN';

  const [staff,    setStaff]    = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [toast,    setToast]    = useState<{msg:string;type:'success'|'error'|'info'}|null>(null);
  const [copied,   setCopied]   = useState(false);
  const [rotating, setRotating] = useState(false);
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [showAddClin,  setShowAddClin]  = useState(false);
  const [showCreate,   setShowCreate]   = useState(false);

  const show = (msg:string, type:'success'|'error'|'info'='info') => setToast({msg,type});

  useEffect(() => {
    if (!clinicId) { setLoading(false); return; }
    clinicsApi.staff(clinicId)
      .then(r => setStaff(r.data.data ?? []))
      .catch(() => show('Failed to load staff.','error'))
      .finally(() => setLoading(false));
  }, [clinicId]);

  const copy = () => { navigator.clipboard.writeText(clinic?.invite_code ?? ''); setCopied(true); setTimeout(() => setCopied(false), 2200); };

  const rotate = async () => {
    if (!clinicId) return;
    setRotating(true);
    try {
      await clinicsApi.rotateInvite(clinicId);
      await refreshClinic();
      show('Invite code rotated. Old code is now invalid.','success');
    } catch { show('Failed to rotate invite code.','error'); }
    finally { setRotating(false); }
  };

  const reloadStaff = async () => {
    if (!clinicId) return;
    const r = await clinicsApi.staff(clinicId);
    setStaff(r.data.data ?? []);
  };

  if (loading) return <PageLoad/>;

  const admins     = staff.filter(s => s.role === 'ADMIN');
  const clinicians = staff.filter(s => s.role === 'CLINICIAN');

  return (
    <div className="page" style={{ padding:22 }}>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)}/>}

      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:18 }}>
        <div>
          <h1 style={{ fontFamily:'Syne,sans-serif', fontSize:21, fontWeight:700, color:'var(--text)' }}>Clinic Management</h1>
          <p style={{ fontSize:12, color:'var(--muted)', marginTop:3 }}>Staff, invite codes, and clinic settings</p>
        </div>
      </div>

      {/* No clinic yet */}
      {!clinicId || !clinic ? (
        <div className="card" style={{ padding:24 }}>
          <Empty icon={<Building2 size={26}/>} title="No clinic yet" sub="Create your clinic to get started."/>
          {isAdmin && (
            <div style={{ textAlign:'center', marginTop:8 }}>
              <button className="btn btn-primary" onClick={() => setShowCreate(true)}><Plus size={13}/> Create Clinic</button>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Clinic info */}
          <div className="card" style={{ padding:16, marginBottom:14 }}>
            <div style={{ display:'flex', alignItems:'center', gap:11, marginBottom:14 }}>
              <div style={{ width:40, height:40, borderRadius:12, background:'var(--cyan-bg)', border:'1px solid rgba(0,191,224,0.22)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Building2 size={18} color="var(--cyan)"/>
              </div>
              <div>
                <p style={{ fontSize:15, fontWeight:700, fontFamily:'Syne,sans-serif', color:'var(--text)' }}>{clinic.name}</p>
                <p style={{ fontSize:11, color:'var(--muted)' }}>
                  {clinic.slug} · Created {fmtDate(clinic.created_at)} · {clinic.is_active
                    ? <span style={{ color:'var(--green)' }}>Active</span>
                    : <span style={{ color:'var(--rose)' }}>Inactive</span>}
                </p>
              </div>
            </div>

            {/* Invite code */}
            <div style={{ padding:'12px 13px', borderRadius:10, background:'var(--s2)', border:'1px solid rgba(232,160,0,0.28)' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:7 }}>
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <Key size={12} color="var(--amber)"/>
                  <span className="lbl">Clinic Invite Code</span>
                </div>
                {isAdmin && (
                  <div style={{ display:'flex', gap:5 }}>
                    <button className="btn btn-ghost btn-sm" onClick={copy}>{copied ? <Check size={10}/> : <Copy size={10}/>}{copied ? 'Copied' : 'Copy'}</button>
                    <button className="btn btn-ghost btn-sm" disabled={rotating} onClick={rotate}>{rotating ? <Spin size={10}/> : <RefreshCw size={10}/>} Rotate</button>
                  </div>
                )}
              </div>
              <code style={{ fontFamily:'JetBrains Mono', fontSize:21, fontWeight:700, color:'var(--amber)', letterSpacing:'0.14em' }}>
                {clinic.invite_code ?? '—'}
              </code>
              <p style={{ fontSize:11, color:'var(--muted)', marginTop:5, lineHeight:1.5 }}>
                Share this code with clinicians (role: CLINICIAN) and patients (role: PATIENT) to join your clinic.
                {isAdmin && ' Rotating the code immediately invalidates the previous one.'}
              </p>
            </div>
          </div>

          {/* Add staff buttons */}
          {isAdmin && (
            <div style={{ display:'flex', gap:7, marginBottom:14 }}>
              <button className="btn btn-ghost" onClick={() => setShowAddAdmin(true)}><Plus size={12}/> Add Admin</button>
              <button className="btn btn-ghost" onClick={() => setShowAddClin(true)}><Plus size={12}/> Add Clinician</button>
            </div>
          )}

          {/* Admins */}
          {admins.length > 0 && (
            <div className="card" style={{ overflow:'hidden', marginBottom:12 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, padding:'11px 15px', borderBottom:'1px solid var(--border)', background:'var(--s2)' }}>
                <Shield size={13} color="var(--amber)"/>
                <span style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>Administrators</span>
                <span className="badge b-amber" style={{ fontSize:9 }}>{admins.length}</span>
              </div>
              <table className="tbl">
                <thead><tr><th>Name</th><th>Email</th><th>Credentials</th><th>Last Active</th></tr></thead>
                <tbody>
                  {admins.map((s:any) => (
                    <tr key={s.id} style={{ borderBottom:'1px solid var(--border)' }}>
                      <td>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <div style={{ width:26, height:26, borderRadius:13, background:'var(--amber-bg)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, color:'var(--amber)', flexShrink:0 }}>
                            {(s.first_name?.[0] ?? s.email[0]).toUpperCase()}
                          </div>
                          <span style={{ fontSize:12, fontWeight:500, color:'var(--text)' }}>{s.first_name ? `${s.first_name} ${s.last_name??''}` : '—'}</span>
                        </div>
                      </td>
                      <td style={{ fontSize:11, color:'var(--muted)' }}>{s.email}</td>
                      <td style={{ fontSize:11, color:'var(--muted)' }}>{s.credentials ?? '—'}</td>
                      <td style={{ fontSize:10, fontFamily:'JetBrains Mono', color:'var(--muted)' }}>{ago(s.last_login_at ?? s.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Clinicians */}
          <div className="card" style={{ overflow:'hidden' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, padding:'11px 15px', borderBottom:'1px solid var(--border)', background:'var(--s2)' }}>
              <Users size={13} color="var(--cyan)"/>
              <span style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>Clinicians</span>
              <span className="badge b-cyan" style={{ fontSize:9 }}>{clinicians.length}</span>
            </div>
            {clinicians.length === 0 ? (
              <Empty icon={<Users size={22}/>} title="No clinicians yet"
                sub={`Share invite code ${clinic.invite_code ?? ''} — clinicians register with role: CLINICIAN.`}/>
            ) : (
              <table className="tbl">
                <thead><tr><th>Name</th><th>Email</th><th>Specialty</th><th>Credentials</th><th>Last Active</th></tr></thead>
                <tbody>
                  {clinicians.map((s:any) => (
                    <tr key={s.id} style={{ borderBottom:'1px solid var(--border)' }}>
                      <td>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <div style={{ width:26, height:26, borderRadius:13, background:'var(--cyan-bg)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, color:'var(--cyan)', flexShrink:0 }}>
                            {(s.first_name?.[0] ?? s.email[0]).toUpperCase()}
                          </div>
                          <span style={{ fontSize:12, fontWeight:500, color:'var(--text)' }}>{s.first_name ? `${s.first_name} ${s.last_name??''}` : '—'}</span>
                        </div>
                      </td>
                      <td style={{ fontSize:11, color:'var(--muted)' }}>{s.email}</td>
                      <td style={{ fontSize:11, color:'var(--muted)' }}>{s.specialty ?? '—'}</td>
                      <td style={{ fontSize:11, color:'var(--muted)' }}>{s.credentials ?? '—'}</td>
                      <td style={{ fontSize:10, fontFamily:'JetBrains Mono', color:'var(--muted)' }}>{ago(s.last_login_at ?? s.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* Create Clinic (admin with no clinic yet) */}
      <CreateClinicModal open={showCreate} onClose={() => setShowCreate(false)}
        onCreated={() => { setShowCreate(false); window.location.reload(); }}/>

      {/* Add Admin */}
      <AddStaffModal open={showAddAdmin} role="ADMIN" inviteCode={clinic?.invite_code}
        onClose={() => setShowAddAdmin(false)}
        onAdded={() => { setShowAddAdmin(false); reloadStaff(); show('Admin account created.','success'); }}/>

      {/* Add Clinician */}
      <AddStaffModal open={showAddClin} role="CLINICIAN" inviteCode={clinic?.invite_code}
        onClose={() => setShowAddClin(false)}
        onAdded={() => { setShowAddClin(false); reloadStaff(); show('Clinician account created.','success'); }}/>
    </div>
  );
}

function CreateClinicModal({ open, onClose, onCreated }: any) {
  const [form, setForm] = useState({ name:'', slug:'' });
  const [busy, setBusy] = useState(false);
  const [err,  setErr]  = useState('');

  const submit = async () => {
    if (!form.name.trim()) { setErr('Name is required.'); return; }
    setBusy(true); setErr('');
    try {
      await clinicsApi.create(form.name.trim(), form.slug.trim());
      onCreated();
    } catch (ex:any) {
      const code = ex?.response?.data?.code ?? '';
      setErr(code === 'SLUG_TAKEN' ? 'That slug is taken. Try another.' : (ex?.response?.data?.error ?? 'Failed.'));
    } finally { setBusy(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Create Clinic" width={420}>
      <div style={{ display:'flex', flexDirection:'column', gap:11, marginBottom:14 }}>
        <Field label="Clinic name *">
          <input className="inp" placeholder="e.g. Reardon Protocol Dubai" value={form.name}
            onChange={e => { const n = e.target.value; setForm({ name:n, slug:slugify(n) }); }}/>
        </Field>
        <Field label="Slug (auto-generated)">
          <input className="inp inp-sm" value={form.slug}
            onChange={e => setForm(v => ({ ...v, slug:slugify(e.target.value) }))}
            style={{ fontFamily:'JetBrains Mono' }}/>
        </Field>
      </div>
      {err && <p style={{ fontSize:11, color:'var(--rose)', marginBottom:9 }}>{err}</p>}
      <div style={{ display:'flex', gap:7, justifyContent:'flex-end' }}>
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" disabled={busy} onClick={submit}>{busy && <Spin size={12}/>} Create Clinic</button>
      </div>
    </Modal>
  );
}

function AddStaffModal({ open, role, inviteCode, onClose, onAdded }: any) {
  const [form, setForm] = useState({ firstName:'', lastName:'', email:'', pw:'' });
  const [busy, setBusy] = useState(false);
  const [err,  setErr]  = useState('');

  const submit = async () => {
    if (!form.email || !form.pw) { setErr('Email and password required.'); return; }
    if (form.pw.length < 8)     { setErr('Password must be at least 8 characters.'); return; }
    setBusy(true); setErr('');
    try {
      await authApi.register({
        email: form.email.trim(), password: form.pw,
        role, first_name: form.firstName.trim(), last_name: form.lastName.trim(),
        invite_code: inviteCode,
      });
      onAdded();
      setForm({ firstName:'', lastName:'', email:'', pw:'' });
    } catch (ex:any) {
      const code = ex?.response?.data?.code ?? '';
      setErr(code === 'EMAIL_TAKEN' ? 'An account with this email already exists.' : (ex?.response?.data?.error ?? 'Registration failed.'));
    } finally { setBusy(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title={`Add ${role === 'ADMIN' ? 'Administrator' : 'Clinician'}`} width={420}>
      <p style={{ fontSize:12, color:'var(--muted)', marginBottom:14, lineHeight:1.6 }}>
        This creates an account linked to your clinic using invite code{' '}
        <code style={{ fontFamily:'JetBrains Mono', color:'var(--amber)', fontWeight:700 }}>{inviteCode}</code>.
      </p>
      <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:14 }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:9 }}>
          <Field label="First name"><input className="inp" placeholder="First" value={form.firstName} onChange={e => setForm(v => ({ ...v, firstName:e.target.value }))}/></Field>
          <Field label="Last name"><input className="inp" placeholder="Last" value={form.lastName} onChange={e => setForm(v => ({ ...v, lastName:e.target.value }))}/></Field>
        </div>
        <Field label="Email *"><input type="email" className="inp" value={form.email} onChange={e => setForm(v => ({ ...v, email:e.target.value }))}/></Field>
        <Field label="Password (min 8) *"><input type="password" className="inp" value={form.pw} onChange={e => setForm(v => ({ ...v, pw:e.target.value }))}/></Field>
      </div>
      {err && <p style={{ fontSize:11, color:'var(--rose)', marginBottom:9 }}>{err}</p>}
      <div style={{ display:'flex', gap:7, justifyContent:'flex-end' }}>
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" disabled={busy} onClick={submit}>{busy && <Spin size={12}/>} Create Account</button>
      </div>
    </Modal>
  );
}
