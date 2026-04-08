import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, useClinic } from '../hooks/ctx';
import { clinicianApi, alertsApi, clinicsApi, auditApi } from '../services/api';
import http from '../services/api';
import { ago, fmtDate, relativeTime, initials } from '../utils/helpers';
import { PageLoad, Empty, Modal, Toast, Spin, FormField, Confirm } from '../components/common/UI';
import {
  Bell, AlertTriangle, CheckCircle, Users, Key, RefreshCw,
  Copy, Check, Plus, Shield, Search, ChevronLeft, ChevronRight,
  Settings, User, Lock, Eye, EyeOff, Building2,
} from 'lucide-react';

function ago2(iso?: string | null) { return ago(iso); }

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ALERTS PAGE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export function AlertsPage() {
  const navigate     = useNavigate();
  const { clinicId } = useClinic();
  const [patients, setPatients] = useState<any[]>([]);
  const [summary,  setSummary]  = useState<any>(null);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState<'all'|'critical'|'urgent'|'warning'>('all');

  useEffect(() => {
    if (!clinicId) return;
    Promise.all([clinicianApi.roster(clinicId), alertsApi.clinicSummary(clinicId)])
      .then(([r, s]) => { setPatients(r.data.data ?? []); setSummary(s.data.data ?? null); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [clinicId]);

  const withAlerts = patients.filter(p => Number(p.open_urgent_alerts) > 0)
    .sort((a, b) => Number(b.open_urgent_alerts) - Number(a.open_urgent_alerts));

  const filtered = filter === 'all' ? withAlerts
    : withAlerts.filter(p => filter === 'critical' ? Number(p.open_urgent_alerts) >= 2 : Number(p.open_urgent_alerts) === 1);

  if (loading) return <PageLoad />;
  return (
    <div className="page" style={{ padding: 24 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: 'Syne', fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>Alert Centre</h1>
        <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>Clinic-wide patient safety alerts</p>
      </div>

      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Critical (24h)',   value: summary.critical_24h ?? 0,              color: 'var(--rose)'  },
            { label: 'Urgent (24h)',     value: summary.urgent_24h ?? 0,               color: 'var(--amber)' },
            { label: 'Unacknowledged',   value: summary.total_unacknowledged ?? 0,     color: 'var(--cyan)'  },
            { label: 'Patients at Risk', value: summary.patients_with_open_urgent ?? 0, color: 'var(--rose)'  },
          ].map(s => (
            <div key={s.label} className="card" style={{ padding: '14px 16px' }}>
              <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>{s.label}</p>
              <p style={{ fontFamily: 'Syne', fontSize: 24, fontWeight: 700, color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
        {(['all','critical','urgent','warning'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding: '5px 12px', borderRadius: 7, fontSize: 12, fontWeight: 500, cursor: 'pointer', border: filter === f ? '1px solid var(--border2)' : '1px solid transparent', background: filter === f ? 'var(--surface3)' : 'transparent', color: filter === f ? 'var(--text)' : 'var(--muted)', transition: 'all 0.12s' }}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <Empty icon={<CheckCircle size={28} />} title={withAlerts.length === 0 ? 'All patients stable' : 'No alerts for this filter'} sub={withAlerts.length === 0 ? 'No open urgent alerts at this time.' : undefined} />
        ) : filtered.map((p, i) => (
          <div key={p.id}
            style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer', transition: 'background 0.1s' }}
            onClick={() => navigate(`/patients/${p.id}`)}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(99,130,180,0.06)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}>
            <div style={{ width: 8, height: 8, borderRadius: 4, flexShrink: 0, background: 'var(--rose)', boxShadow: '0 0 6px var(--rose)' }} />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{p.first_name ? `${p.first_name} ${p.last_name ?? ''}` : p.email}</p>
              <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{p.open_urgent_alerts} open urgent alert(s) · Last CGM {ago(p.last_cgm_at)}{p.latest_glucose ? ` · ${p.latest_glucose} mg/dL` : ''}</p>
            </div>
            <span className="badge-red">{p.open_urgent_alerts} alerts</span>
            <span style={{ fontSize: 11, color: 'var(--cyan)' }}>View →</span>
          </div>
        ))}
      </div>

      {withAlerts.length === 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 10, background: 'var(--green2)', border: '1px solid rgba(0,212,138,0.25)', marginTop: 12, fontSize: 12, color: 'var(--green)' }}>
          <CheckCircle size={14} /> All patients are within safe parameters — no open urgent alerts.
        </div>
      )}
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CLINIC PAGE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export function ClinicPage() {
  const { user }               = useAuth();
  const { clinicId, clinics }  = useClinic();
  const isAdmin                = user?.role === 'ADMIN';
  const [clinic,   setClinic]  = useState<any>(null);
  const [staff,    setStaff]   = useState<any[]>([]);
  const [loading,  setLoading] = useState(true);
  const [copied,   setCopied]  = useState(false);
  const [rotating, setRotating]= useState(false);
  const [toast,    setToast]   = useState<{ msg: string; type: 'success'|'error'|'info' } | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newClinic, setNewClinic]   = useState({ name: '', slug: '' });
  const [creating, setCreating]     = useState(false);
  const [createErr, setCreateErr]   = useState('');

  const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

  useEffect(() => {
    if (!clinicId) { setLoading(false); return; }
    Promise.all([clinicsApi.get(clinicId), clinicsApi.staff(clinicId)])
      .then(([c, s]) => { setClinic(c.data.data); setStaff(s.data.data ?? []); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [clinicId]);

  const copy = () => { navigator.clipboard.writeText(clinic?.invite_code ?? ''); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  const rotate = async () => {
    if (!clinicId) return;
    setRotating(true);
    try {
      await clinicsApi.rotateInvite(clinicId);
      const r = await clinicsApi.get(clinicId);
      setClinic(r.data.data);
      setToast({ msg: 'Invite code rotated. Old code is now invalid.', type: 'success' });
    } catch { setToast({ msg: 'Failed to rotate code.', type: 'error' }); }
    finally { setRotating(false); }
  };

  const createClinic = async () => {
    if (!newClinic.name.trim()) { setCreateErr('Name required.'); return; }
    setCreating(true); setCreateErr('');
    try {
      await clinicsApi.create(newClinic.name.trim(), newClinic.slug.trim());
      setShowCreate(false);
      setNewClinic({ name: '', slug: '' });
      setToast({ msg: 'Clinic created.', type: 'success' });
      window.location.reload();
    } catch (ex: any) { setCreateErr(ex?.response?.data?.error ?? 'Failed.'); }
    finally { setCreating(false); }
  };

  if (loading) return <PageLoad />;

  return (
    <div className="page" style={{ padding: 24 }}>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: 'Syne', fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>Clinic Management</h1>
          <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>Staff, invite codes, and partitioning</p>
        </div>
        {isAdmin && <button className="btn-primary" onClick={() => setShowCreate(true)}><Plus size={14} /> New Clinic</button>}
      </div>

      {/* Clinic info + invite */}
      {clinic && (
        <div className="card" style={{ padding: 18, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--cyan2)', border: '1px solid rgba(0,200,240,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Building2 size={18} color="var(--cyan)" />
              </div>
              <div>
                <p style={{ fontSize: 15, fontWeight: 700, fontFamily: 'Syne', color: 'var(--text)' }}>{clinic.name}</p>
                <p style={{ fontSize: 11, color: 'var(--muted)' }}>Created {fmtDate(clinic.created_at)} · {clinic.is_active ? <span style={{ color: 'var(--green)' }}>Active</span> : 'Inactive'}</p>
              </div>
            </div>
          </div>
          {/* Invite code */}
          <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--surface2)', border: '1px solid rgba(240,168,0,0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Key size={13} color="var(--amber)" />
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Invite Code</span>
              </div>
              {isAdmin && (
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn-ghost btn-sm" onClick={copy}>{copied ? <Check size={11} /> : <Copy size={11} />}{copied ? 'Copied' : 'Copy'}</button>
                  <button className="btn-ghost btn-sm" disabled={rotating} onClick={rotate}>{rotating ? <Spin size={11} /> : <RefreshCw size={11} />}Rotate</button>
                </div>
              )}
            </div>
            <code style={{ fontFamily: 'JetBrains Mono', fontSize: 22, fontWeight: 700, color: 'var(--amber)', letterSpacing: '0.14em' }}>{clinic.invite_code ?? '—'}</code>
            <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>Share with patients and clinicians to join this clinic. Rotating invalidates the previous code.</p>
          </div>
        </div>
      )}

      {/* Staff table */}
      <div className="card" style={{ overflow: 'hidden', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--surface2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users size={14} color="var(--cyan)" />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Clinical Staff</span>
            <span className="badge-cyan" style={{ fontSize: 10 }}>{staff.length}</span>
          </div>
        </div>
        {staff.length === 0 ? (
          <Empty icon={<Users size={24} />} title="No staff yet" sub="Clinicians join using the invite code with a CLINICIAN role." />
        ) : (
          <table className="tbl">
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Specialty</th><th>Last Active</th></tr></thead>
            <tbody>
              {staff.map((s: any) => (
                <tr key={s.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 26, height: 26, borderRadius: 13, background: 'var(--cyan2)', border: '1px solid rgba(0,200,240,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'var(--cyan)' }}>
                        {(s.first_name?.[0] ?? s.email?.[0] ?? 'S').toUpperCase()}
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>{s.first_name ? `${s.first_name} ${s.last_name ?? ''}` : '—'}</span>
                    </div>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--muted)' }}>{s.email}</td>
                  <td><span className={s.role === 'ADMIN' ? 'badge-red' : 'badge-cyan'} style={{ fontSize: 10 }}>{s.role}</span></td>
                  <td style={{ fontSize: 12, color: 'var(--muted)' }}>{s.specialty ?? '—'}</td>
                  <td style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--muted)' }}>{ago(s.last_login_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Admin: all clinics */}
      {isAdmin && clinics.length > 0 && (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--surface2)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Shield size={13} color="var(--amber)" />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>All Clinics</span>
            <span className="badge-amber" style={{ fontSize: 10 }}>{clinics.length}</span>
          </div>
          <table className="tbl">
            <thead><tr><th>Clinic</th><th>Invite Code</th><th>Created</th><th>Status</th></tr></thead>
            <tbody>
              {clinics.map((c: any) => (
                <tr key={c.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{c.name}</td>
                  <td><code style={{ fontFamily: 'JetBrains Mono', fontSize: 12, fontWeight: 700, color: 'var(--amber)' }}>{c.invite_code ?? '—'}</code></td>
                  <td style={{ fontSize: 11, color: 'var(--muted)' }}>{fmtDate(c.created_at)}</td>
                  <td><span className={c.is_active ? 'badge-green' : 'badge-muted'} style={{ fontSize: 10 }}>{c.is_active ? 'Active' : 'Inactive'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create New Clinic" width={420}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          <FormField label="Clinic name *">
            <input className="inp" placeholder="e.g. Reardon Protocol Dubai" value={newClinic.name}
              onChange={e => { const n = e.target.value; setNewClinic(v => ({ name: n, slug: slugify(n) })); }} />
          </FormField>
          <FormField label="Slug (URL-safe, auto-generated)">
            <input className="inp inp-sm" placeholder="reardon-protocol-dubai" value={newClinic.slug}
              onChange={e => setNewClinic(v => ({ ...v, slug: slugify(e.target.value) }))}
              style={{ fontFamily: 'JetBrains Mono', fontSize: 12 }} />
          </FormField>
        </div>
        {createErr && <p style={{ fontSize: 11, color: 'var(--rose)', marginBottom: 10 }}>{createErr}</p>}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button>
          <button className="btn-primary" disabled={creating} onClick={createClinic}>{creating && <Spin size={13} />} Create Clinic</button>
        </div>
      </Modal>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AUDIT LOG PAGE (admin only)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export function AuditPage() {
  const [logs,    setLogs]    = useState<any[]>([]);
  const [stats,   setStats]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [action,  setAction]  = useState('');
  const [page,    setPage]    = useState(1);
  const PER = 50;

  useEffect(() => {
    Promise.all([auditApi.logs({ limit: 200, action: action || undefined }), auditApi.stats()])
      .then(([l, s]) => { setLogs(l.data.data?.logs ?? l.data.data ?? []); setStats(s.data.data ?? []); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [action]);

  const filtered = logs.filter(l => !search || l.action?.includes(search.toUpperCase()) || l.actor_email?.includes(search) || l.resource_type?.includes(search));
  const paged    = filtered.slice((page - 1) * PER, page * PER);
  const pages    = Math.ceil(filtered.length / PER);
  const actions  = [...new Set(logs.map(l => l.action))].sort();

  const badgeFor = (a: string) => {
    if (a.includes('CREATE') || a.includes('REGISTER')) return 'badge-green';
    if (a.includes('UPDATE') || a.includes('ASSIGN'))   return 'badge-amber';
    if (a.includes('VIEW')   || a.includes('EXPORT'))   return 'badge-cyan';
    return 'badge-muted';
  };

  if (loading) return <PageLoad />;
  return (
    <div className="page" style={{ padding: 24 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: 'Syne', fontSize: 22, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Shield size={20} color="var(--amber)" /> Audit Log
        </h1>
        <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>Immutable record of all clinical and system actions (HIPAA)</p>
      </div>

      {/* Action frequency */}
      {stats.length > 0 && (
        <div className="card" style={{ padding: 14, marginBottom: 16 }}>
          <p className="sec-label">Action frequency — last 30 days</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {stats.slice(0, 10).map((s: any) => (
              <div key={s.action} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 8, background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                <span className={`${badgeFor(s.action)}`} style={{ fontSize: 9 }}>{s.action.replace(/_/g, ' ')}</span>
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: 11, fontWeight: 700, color: 'var(--text)' }}>{s.total}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
        <div style={{ position: 'relative', flex: '0 0 220px' }}>
          <Search size={12} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
          <input className="inp" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 28 }} />
        </div>
        <select className="inp" value={action} onChange={e => { setAction(e.target.value); setPage(1); }} style={{ width: 200 }}>
          <option value="">All actions</option>
          {actions.map(a => <option key={a} value={a}>{(a as string).replace(/_/g, ' ')}</option>)}
        </select>
        <span style={{ fontSize: 12, color: 'var(--muted)', alignSelf: 'center', marginLeft: 'auto' }}>{filtered.length} entries</span>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        {paged.length === 0 ? <Empty icon={<Shield size={24} />} title="No audit entries" /> : (
          <table className="tbl">
            <thead><tr><th>Time</th><th>Action</th><th>Actor</th><th>Resource</th><th>IP</th></tr></thead>
            <tbody>
              {paged.map((l: any) => (
                <tr key={l.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: 'var(--muted)' }} title={l.created_at}>{ago(l.created_at)}</td>
                  <td><span className={badgeFor(l.action)} style={{ fontSize: 10 }}>{l.action?.replace(/_/g, ' ')}</span></td>
                  <td style={{ fontSize: 11 }}>
                    <span className={l.actor_role === 'ADMIN' ? 'badge-red' : 'badge-cyan'} style={{ fontSize: 9, marginRight: 5 }}>{l.actor_role}</span>
                    <span style={{ fontFamily: 'JetBrains Mono', color: 'var(--muted)', fontSize: 11 }}>{l.actor_email ?? l.actor_id?.slice(0, 8)}</span>
                  </td>
                  <td style={{ fontSize: 11, color: 'var(--text)' }}>
                    {l.resource_type}
                    {l.resource_id && <span style={{ fontFamily: 'JetBrains Mono', color: 'var(--muted)', marginLeft: 5, fontSize: 10 }}>{l.resource_id.slice(0, 8)}…</span>}
                  </td>
                  <td style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: 'var(--muted)' }}>{l.ip_address ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {pages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>Page {page} of {pages}</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn-ghost btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}><ChevronLeft size={13} /> Prev</button>
            <button className="btn-ghost btn-sm" disabled={page === pages} onClick={() => setPage(p => p + 1)}>Next <ChevronRight size={13} /></button>
          </div>
        </div>
      )}
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SETTINGS PAGE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export function SettingsPage() {
  const { user, refresh } = useAuth();
  const [toast, setToast] = useState<{ msg: string; type: 'success'|'error'|'info' } | null>(null);
  const [profile, setProfile] = useState({ first_name: '', last_name: '', credentials: '', specialty: '' });
  const [savingP, setSavingP] = useState(false);
  const [pw, setPw]           = useState({ current: '', next: '', confirm: '' });
  const [savingPw, setSavingPw] = useState(false);
  const [showPw, setShowPw]   = useState(false);

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
      await http.put('/users/profile', profile);
      await refresh();
      setToast({ msg: 'Profile updated.', type: 'success' });
    } catch (ex: any) { setToast({ msg: ex?.response?.data?.error ?? 'Failed.', type: 'error' }); }
    finally { setSavingP(false); }
  };

  const savePassword = async () => {
    if (pw.next !== pw.confirm) { setToast({ msg: 'Passwords do not match.', type: 'error' }); return; }
    if (pw.next.length < 8)    { setToast({ msg: 'Password must be at least 8 characters.', type: 'error' }); return; }
    setSavingPw(true);
    try {
      await http.post('/auth/change-password', { current_password: pw.current, new_password: pw.next });
      setPw({ current: '', next: '', confirm: '' });
      setToast({ msg: 'Password changed.', type: 'success' });
    } catch (ex: any) { setToast({ msg: ex?.response?.data?.error ?? 'Failed.', type: 'error' }); }
    finally { setSavingPw(false); }
  };

  return (
    <div className="page" style={{ padding: 24, maxWidth: 600 }}>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: 'Syne', fontSize: 22, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Settings size={18} color="var(--cyan)" /> Settings
        </h1>
        <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>Account and profile preferences</p>
      </div>

      {/* Profile */}
      <div className="card" style={{ padding: 18, marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <User size={14} color="var(--cyan)" />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Clinical Profile</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
          <FormField label="First name"><input className="inp" value={profile.first_name} onChange={e => setProfile(v => ({ ...v, first_name: e.target.value }))} placeholder="First name" /></FormField>
          <FormField label="Last name"><input className="inp" value={profile.last_name} onChange={e => setProfile(v => ({ ...v, last_name: e.target.value }))} placeholder="Last name" /></FormField>
          <FormField label="Credentials"><input className="inp" value={profile.credentials} onChange={e => setProfile(v => ({ ...v, credentials: e.target.value }))} placeholder="e.g. MD, FACP" /></FormField>
          <FormField label="Specialty"><input className="inp" value={profile.specialty} onChange={e => setProfile(v => ({ ...v, specialty: e.target.value }))} placeholder="e.g. Endocrinology" /></FormField>
        </div>
        <FormField label="Email (read-only)"><input className="inp" value={user?.email ?? ''} readOnly style={{ opacity: 0.5 }} /></FormField>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
          <button className="btn-primary" disabled={savingP} onClick={saveProfile}>{savingP && <Spin size={13} />} Save Profile</button>
        </div>
      </div>

      {/* Password */}
      <div className="card" style={{ padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <Lock size={14} color="var(--cyan)" />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Change Password</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
          {[['current', 'Current password'], ['next', 'New password (min 8 chars)'], ['confirm', 'Confirm new password']].map(([k, l]) => (
            <FormField key={k} label={l}>
              <div style={{ position: 'relative' }}>
                <input type={showPw ? 'text' : 'password'} className="inp" value={(pw as any)[k]} onChange={e => setPw(v => ({ ...v, [k]: e.target.value }))} placeholder="••••••••" style={{ paddingRight: k === 'current' ? 34 : 12 }} />
                {k === 'current' && <button type="button" onClick={() => setShowPw(v => !v)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}>{showPw ? <EyeOff size={13} /> : <Eye size={13} />}</button>}
              </div>
            </FormField>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn-primary" disabled={savingPw} onClick={savePassword}>{savingPw && <Spin size={13} />} Change Password</button>
        </div>
      </div>
    </div>
  );
}

function relativeTime(iso?: string | null) { return ago(iso); }
