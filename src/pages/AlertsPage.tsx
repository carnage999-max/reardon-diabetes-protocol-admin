import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClinic } from '../hooks/ctx';
import { clinicianApi, alertsApi } from '../services/api';
import { ago } from '../utils/helpers';
import { PageLoad, Empty, Toast } from '../components/common/UI';
import { Bell, AlertTriangle, CheckCircle } from 'lucide-react';

export default function AlertsPage() {
  const navigate     = useNavigate();
  const { clinicId } = useClinic();
  const [patients, setPatients] = useState<any[]>([]);
  const [summary,  setSummary]  = useState<any>(null);
  const [loading,  setLoading]  = useState(true);
  const [toast,    setToast]    = useState<{msg:string;type:'success'|'error'|'info'}|null>(null);
  const [filter,   setFilter]   = useState<'all'|'critical'|'warning'>('all');

  useEffect(() => {
    if (!clinicId) return;
    Promise.all([clinicianApi.roster(clinicId), alertsApi.clinicSummary(clinicId)])
      .then(([r, a]) => { setPatients(r.data.data ?? []); setSummary(a.data.data ?? null); })
      .catch(() => setToast({msg:'Failed to load alerts.',type:'error'}))
      .finally(() => setLoading(false));
  }, [clinicId]);

  // Patients with open alerts, sorted by most alerts first
  const withAlerts = patients
    .filter(p => Number(p.open_urgent_alerts) > 0)
    .sort((a, b) => Number(b.open_urgent_alerts) - Number(a.open_urgent_alerts));

  const displayed = filter === 'all'     ? withAlerts
    : filter === 'critical' ? withAlerts.filter(p => Number(p.open_urgent_alerts) >= 2)
    : withAlerts.filter(p => Number(p.open_urgent_alerts) === 1);

  if (loading) return <PageLoad/>;

  return (
    <div className="page" style={{ padding:22 }}>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)}/>}

      <div style={{ marginBottom:18 }}>
        <h1 style={{ fontFamily:'Syne,sans-serif', fontSize:21, fontWeight:700, color:'var(--text)' }}>Alert Centre</h1>
        <p style={{ fontSize:12, color:'var(--muted)', marginTop:3 }}>Clinic-wide patient safety alerts</p>
      </div>

      {/* Summary cards */}
      {summary && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:18 }}>
          {[
            { label:'Critical (24h)',    value:summary.critical_24h??0,              color:'var(--rose)' },
            { label:'Urgent (24h)',      value:summary.urgent_24h??0,               color:'var(--amber)' },
            { label:'Unacknowledged',    value:summary.total_unacknowledged??0,     color:'var(--cyan)' },
            { label:'Patients at Risk',  value:summary.patients_with_open_urgent??0, color:'var(--rose)' },
          ].map(s => (
            <div key={s.label} className="card" style={{ padding:'13px 15px' }}>
              <p className="lbl" style={{ marginBottom:6 }}>{s.label}</p>
              <p style={{ fontFamily:'Syne,sans-serif', fontSize:22, fontWeight:700, color:s.color }}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filter */}
      <div style={{ display:'flex', gap:4, marginBottom:13 }}>
        {(['all','critical','warning'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding:'4px 11px', borderRadius:6, fontSize:12, fontWeight:500, cursor:'pointer', border:filter===f?'1px solid var(--border2)':'1px solid transparent', background:filter===f?'var(--s3)':'transparent', color:filter===f?'var(--text)':'var(--muted)', transition:'all 0.12s' }}>
            {f.charAt(0).toUpperCase()+f.slice(1)}
          </button>
        ))}
        <span style={{ fontSize:11, color:'var(--muted)', alignSelf:'center', marginLeft:8 }}>{withAlerts.length} patients with alerts</span>
      </div>

      {/* Alert list */}
      <div className="card" style={{ overflow:'hidden' }}>
        {displayed.length === 0 ? (
          <Empty icon={withAlerts.length===0 ? <CheckCircle size={26}/> : <Bell size={26}/>}
            title={withAlerts.length===0 ? 'All patients stable' : 'No alerts match this filter'}
            sub={withAlerts.length===0 ? 'No open urgent alerts at this time.' : undefined}/>
        ) : displayed.map((p, i) => (
          <div key={p.id} onClick={() => navigate(`/patients/${p.id}`)}
            style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', borderBottom:i<displayed.length-1?'1px solid var(--border)':'none', cursor:'pointer', transition:'background 0.1s' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background='rgba(80,110,160,0.06)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background=''}>
            <div style={{ width:8, height:8, borderRadius:4, flexShrink:0, background:'var(--rose)', boxShadow:'0 0 6px var(--rose)', animation:'pulse 2s infinite' }}/>
            <div style={{ flex:1 }}>
              <p style={{ fontSize:13, fontWeight:500, color:'var(--text)' }}>
                {p.first_name ? `${p.first_name} ${p.last_name??''}` : p.email}
              </p>
              <p style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>
                {p.open_urgent_alerts} open urgent alert(s) · Last CGM {ago(p.last_cgm_at)}
                {p.latest_glucose ? ` · ${p.latest_glucose} mg/dL` : ''}
              </p>
            </div>
            <span className="badge b-red">{p.open_urgent_alerts} alerts</span>
            <span style={{ fontSize:11, color:'var(--cyan)', flexShrink:0 }}>View →</span>
          </div>
        ))}
      </div>

      {withAlerts.length === 0 && (
        <div style={{ display:'flex', alignItems:'center', gap:9, padding:'11px 15px', borderRadius:9, background:'var(--green-bg)', border:'1px solid rgba(0,200,122,0.22)', marginTop:12, fontSize:12, color:'var(--green)' }}>
          <CheckCircle size={13}/> All patients are within safe parameters — no open urgent alerts right now.
        </div>
      )}

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
    </div>
  );
}
