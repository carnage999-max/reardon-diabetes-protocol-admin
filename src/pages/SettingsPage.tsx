import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/ctx';
import { usersApi } from '../services/api';
import http from '../services/api';
import { Toast, Spin, Field } from '../components/common/UI';
import { Settings, User, Lock, Eye, EyeOff } from 'lucide-react';

export default function SettingsPage() {
  const { user, reload } = useAuth();
  const [toast,   setToast]   = useState<{msg:string;type:'success'|'error'|'info'}|null>(null);
  const [profile, setProfile] = useState({ first_name:'', last_name:'', credentials:'', specialty:'' });
  const [savingP, setSavingP] = useState(false);
  const [pw,      setPw]      = useState({ current:'', next:'', confirm:'' });
  const [savingW, setSavingW] = useState(false);
  const [showPw,  setShowPw]  = useState(false);

  const show = (msg:string, type:'success'|'error'|'info'='info') => setToast({msg,type});

  useEffect(() => {
    if (user?.profile) setProfile({
      first_name:  user.profile.first_name  ?? '',
      last_name:   user.profile.last_name   ?? '',
      credentials: user.profile.credentials ?? '',
      specialty:   user.profile.specialty   ?? '',
    });
  }, [user]);

  const saveProfile = async () => {
    setSavingP(true);
    try {
      await usersApi.updateProfile(profile);
      await reload();
      show('Profile updated.','success');
    } catch (ex:any) { show(ex?.response?.data?.error ?? 'Failed to update profile.','error'); }
    finally { setSavingP(false); }
  };

  const savePassword = async () => {
    if (pw.next !== pw.confirm) { show('New passwords do not match.','error'); return; }
    if (pw.next.length < 8)    { show('Password must be at least 8 characters.','error'); return; }
    setSavingW(true);
    try {
      await http.post('/auth/change-password', { current_password:pw.current, new_password:pw.next });
      setPw({ current:'', next:'', confirm:'' });
      show('Password changed. All sessions have been revoked.','success');
    } catch (ex:any) {
      const code = ex?.response?.data?.code ?? '';
      show(code==='WRONG_PASSWORD' ? 'Current password is incorrect.' : (ex?.response?.data?.error ?? 'Failed to change password.'),'error');
    } finally { setSavingW(false); }
  };

  return (
    <div className="page" style={{ padding:22, maxWidth:580 }}>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)}/>}

      <div style={{ marginBottom:18 }}>
        <h1 style={{ fontFamily:'Syne,sans-serif', fontSize:21, fontWeight:700, color:'var(--text)', display:'flex', alignItems:'center', gap:9 }}>
          <Settings size={18} color="var(--cyan)"/> Settings
        </h1>
        <p style={{ fontSize:12, color:'var(--muted)', marginTop:3 }}>Account and profile preferences</p>
      </div>

      {/* Role info */}
      <div style={{ padding:'10px 13px', borderRadius:9, background:'var(--s2)', border:'1px solid var(--border)', marginBottom:14, display:'flex', alignItems:'center', gap:10 }}>
        <div>
          <p style={{ fontSize:12, fontWeight:600, color:'var(--text)' }}>{user?.email}</p>
          <p style={{ fontSize:11, color:'var(--muted)' }}>
            Role: <span style={{ color:user?.role==='ADMIN'?'var(--amber)':'var(--cyan)', fontWeight:600 }}>{user?.role === 'ADMIN' ? (user.clinic_id ? 'Clinic Administrator' : 'Platform Administrator') : 'Clinician'}</span>
            {user?.clinic_name && <span style={{ color:'var(--muted)' }}> · {user.clinic_name}</span>}
          </p>
        </div>
      </div>

      {/* Profile */}
      <div className="card" style={{ padding:16, marginBottom:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:14 }}>
          <User size={13} color="var(--cyan)"/>
          <span style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>Clinical Profile</span>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
          <Field label="First name">
            <input className="inp" placeholder="First name" value={profile.first_name} onChange={e => setProfile(v => ({ ...v, first_name:e.target.value }))}/>
          </Field>
          <Field label="Last name">
            <input className="inp" placeholder="Last name" value={profile.last_name} onChange={e => setProfile(v => ({ ...v, last_name:e.target.value }))}/>
          </Field>
          <Field label="Credentials">
            <input className="inp" placeholder="e.g. MD, FACP, FRCP" value={profile.credentials} onChange={e => setProfile(v => ({ ...v, credentials:e.target.value }))}/>
          </Field>
          <Field label="Specialty">
            <input className="inp" placeholder="e.g. Endocrinology" value={profile.specialty} onChange={e => setProfile(v => ({ ...v, specialty:e.target.value }))}/>
          </Field>
        </div>
        <Field label="Email address (read-only)">
          <input className="inp" value={user?.email ?? ''} readOnly style={{ opacity:0.5, cursor:'not-allowed' }}/>
        </Field>
        <div style={{ display:'flex', justifyContent:'flex-end', marginTop:12 }}>
          <button className="btn btn-primary" disabled={savingP} onClick={saveProfile}>{savingP && <Spin size={12}/>} Save Profile</button>
        </div>
      </div>

      {/* Password */}
      <div className="card" style={{ padding:16 }}>
        <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:14 }}>
          <Lock size={13} color="var(--cyan)"/>
          <span style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>Change Password</span>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:12 }}>
          {[
            { k:'current', l:'Current password', ph:'Current password' },
            { k:'next',    l:'New password (min 8 chars)', ph:'New password' },
            { k:'confirm', l:'Confirm new password', ph:'Repeat new password' },
          ].map(f => (
            <Field key={f.k} label={f.l}>
              <div style={{ position:'relative' }}>
                <input type={showPw ? 'text' : 'password'} className="inp" placeholder={f.ph}
                  value={(pw as any)[f.k]} onChange={e => setPw(v => ({ ...v, [f.k]:e.target.value }))}
                  style={{ paddingRight:f.k==='current' ? 34 : 11 }}/>
                {f.k === 'current' && (
                  <button type="button" onClick={() => setShowPw(v => !v)}
                    style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'var(--muted)' }}>
                    {showPw ? <EyeOff size={12}/> : <Eye size={12}/>}
                  </button>
                )}
              </div>
            </Field>
          ))}
        </div>
        <p style={{ fontSize:11, color:'var(--muted)', marginBottom:12 }}>Changing your password will revoke all active sessions on all devices.</p>
        <div style={{ display:'flex', justifyContent:'flex-end' }}>
          <button className="btn btn-primary" disabled={savingW} onClick={savePassword}>{savingW && <Spin size={12}/>} Change Password</button>
        </div>
      </div>
    </div>
  );
}
