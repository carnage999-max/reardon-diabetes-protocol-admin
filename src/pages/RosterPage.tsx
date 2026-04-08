import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClinic } from '../hooks/ctx';
import { clinicianApi, alertsApi } from '../services/api';
import { ago, diabetesLabel, riskLevel, riskScore, initials } from '../utils/helpers';
import { PageLoad, Empty, RiskBadge, GlucosePill, Toast } from '../components/common/UI';
import { Users, Search, AlertTriangle, TrendingDown, Clock, ChevronUp, ChevronDown } from 'lucide-react';

type SortKey = 'risk'|'name'|'glucose'|'adherence'|'alerts'|'last_cgm';
type Dir = 'asc'|'desc';

function Th({ col, label, active, dir, onSort }: any) {
  return (
    <th style={{ padding:'9px 14px', textAlign:'left', fontSize:10, fontWeight:700, color:active ? 'var(--cyan)' : 'var(--muted)', letterSpacing:'0.06em', textTransform:'uppercase', borderBottom:'1px solid var(--border)', background:'var(--s2)', cursor:'pointer', userSelect:'none', whiteSpace:'nowrap' }}
      onClick={() => onSort(col)}>
      <span style={{ display:'inline-flex', alignItems:'center', gap:4 }}>
        {label}
        {active ? (dir === 'asc' ? <ChevronUp size={10}/> : <ChevronDown size={10}/>) : <ChevronDown size={10} style={{ opacity:0.3 }}/>}
      </span>
    </th>
  );
}

export default function RosterPage() {
  const navigate     = useNavigate();
  const { clinicId } = useClinic();
  const [patients, setPatients] = useState<any[]>([]);
  const [summary,  setSummary]  = useState<any>(null);
  const [loading,  setLoading]  = useState(true);
  const [toast,    setToast]    = useState<{ msg:string; type:'success'|'error'|'info' }|null>(null);
  const [search,   setSearch]   = useState('');
  const [filter,   setFilter]   = useState<'all'|'critical'|'warning'>('all');
  const [sortKey,  setSortKey]  = useState<SortKey>('risk');
  const [sortDir,  setSortDir]  = useState<Dir>('desc');

  useEffect(() => {
    if (!clinicId) return;
    setLoading(true);
    Promise.all([clinicianApi.roster(clinicId), alertsApi.clinicSummary(clinicId)])
      .then(([r, a]) => { setPatients(r.data.data ?? []); setSummary(a.data.data ?? null); })
      .catch(() => setToast({ msg:'Failed to load roster.', type:'error' }))
      .finally(() => setLoading(false));
  }, [clinicId]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const displayed = useMemo(() => {
    let list = [...patients];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(p => `${p.first_name??''} ${p.last_name??''}`.toLowerCase().includes(q) || p.email?.toLowerCase().includes(q));
    }
    if (filter !== 'all') list = list.filter(p => riskLevel(p) === filter);

    return list.sort((a, b) => {
      let va = 0, vb = 0;
      if (sortKey === 'risk')      { return sortDir === 'asc' ? riskScore(a) - riskScore(b) : riskScore(b) - riskScore(a); }
      if (sortKey === 'name')      { const na = `${a.first_name??''}${a.last_name??''}`, nb = `${b.first_name??''}${b.last_name??''}`; return sortDir === 'asc' ? na.localeCompare(nb) : nb.localeCompare(na); }
      if (sortKey === 'glucose')   { va = Number(a.latest_glucose)    || 0; vb = Number(b.latest_glucose)    || 0; }
      if (sortKey === 'adherence') { va = Number(a.adherence_pct_7d)  || 0; vb = Number(b.adherence_pct_7d)  || 0; }
      if (sortKey === 'alerts')    { va = Number(a.open_urgent_alerts) || 0; vb = Number(b.open_urgent_alerts) || 0; }
      if (sortKey === 'last_cgm')  { va = a.last_cgm_at ? new Date(a.last_cgm_at).getTime() : 0; vb = b.last_cgm_at ? new Date(b.last_cgm_at).getTime() : 0; }
      return sortDir === 'asc' ? va - vb : vb - va;
    });
  }, [patients, search, filter, sortKey, sortDir]);

  const counts = useMemo(() => ({
    total:    patients.length,
    critical: patients.filter(p => riskLevel(p) === 'critical').length,
    warning:  patients.filter(p => riskLevel(p) === 'warning').length,
    lowAdh:   patients.filter(p => !isNaN(Number(p.adherence_pct_7d)) && Number(p.adherence_pct_7d) < 50).length,
  }), [patients]);

  if (loading) return <PageLoad/>;

  return (
    <div className="page" style={{ padding:22 }}>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)}/>}

      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:18 }}>
        <div>
          <h1 style={{ fontFamily:'Syne,sans-serif', fontSize:21, fontWeight:700, color:'var(--text)' }}>Patient Roster</h1>
          <p style={{ fontSize:12, color:'var(--muted)', marginTop:3 }}>{patients.length} patients · sorted by risk · {new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</p>
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:16 }}>
        {[
          { label:'Total Patients',  value:counts.total,    color:'var(--cyan)',  icon:<Users size={13}/> },
          { label:'Critical',        value:counts.critical, color:'var(--rose)',  icon:<AlertTriangle size={13}/> },
          { label:'Need Attention',  value:counts.warning,  color:'var(--amber)', icon:<Clock size={13}/> },
          { label:'Low Adherence',   value:counts.lowAdh,   color:'var(--muted)', icon:<TrendingDown size={13}/> },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding:'13px 15px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:7, color:s.color }}>{s.icon}<span className="lbl">{s.label}</span></div>
            <p style={{ fontFamily:'Syne,sans-serif', fontSize:22, fontWeight:700, color:s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Alert banner */}
      {summary && Number(summary.patients_with_open_urgent) > 0 && (
        <div style={{ display:'flex', alignItems:'center', gap:9, padding:'9px 13px', borderRadius:9, background:'var(--rose-bg)', border:'1px solid rgba(232,64,96,0.22)', marginBottom:13, fontSize:12, color:'var(--rose)' }}>
          <AlertTriangle size={13} style={{ flexShrink:0 }}/>
          <span><strong>{summary.patients_with_open_urgent}</strong> patient(s) with open urgent alerts · {summary.critical_24h} critical, {summary.urgent_24h} urgent in last 24h</span>
        </div>
      )}

      {/* Toolbar */}
      <div style={{ display:'flex', alignItems:'center', gap:9, marginBottom:12 }}>
        <div style={{ position:'relative', flex:'0 0 220px' }}>
          <Search size={12} style={{ position:'absolute', left:9, top:'50%', transform:'translateY(-50%)', color:'var(--muted)' }}/>
          <input className="inp" placeholder="Search patients…" value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft:28 }}/>
        </div>
        <div style={{ display:'flex', gap:3 }}>
          {(['all','critical','warning'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ padding:'4px 11px', borderRadius:6, fontSize:12, fontWeight:500, cursor:'pointer', border:filter === f ? '1px solid var(--border2)' : '1px solid transparent', background:filter === f ? 'var(--s3)' : 'transparent', color:filter === f ? 'var(--text)' : 'var(--muted)', transition:'all 0.12s' }}>
              {f.charAt(0).toUpperCase()+f.slice(1)}
            </button>
          ))}
        </div>
        <span style={{ fontSize:11, color:'var(--muted)', marginLeft:'auto' }}>{displayed.length} shown</span>
      </div>

      {/* Table */}
      <div className="card" style={{ overflow:'hidden' }}>
        <table className="tbl">
          <thead>
            <tr>
              <Th col="name"      label="Patient"      active={sortKey==='name'}      dir={sortDir} onSort={toggleSort}/>
              <Th col="risk"      label="Risk"         active={sortKey==='risk'}      dir={sortDir} onSort={toggleSort}/>
              <Th col="glucose"   label="Glucose"      active={sortKey==='glucose'}   dir={sortDir} onSort={toggleSort}/>
              <Th col="adherence" label="Adherence 7d" active={sortKey==='adherence'} dir={sortDir} onSort={toggleSort}/>
              <Th col="alerts"    label="Open Alerts"  active={sortKey==='alerts'}    dir={sortDir} onSort={toggleSort}/>
              <Th col="last_cgm"  label="Last CGM"     active={sortKey==='last_cgm'}  dir={sortDir} onSort={toggleSort}/>
              <th style={{ padding:'9px 14px', fontSize:10, fontWeight:700, color:'var(--muted)', letterSpacing:'0.06em', textTransform:'uppercase', borderBottom:'1px solid var(--border)', background:'var(--s2)' }}>Type</th>
            </tr>
          </thead>
          <tbody>
            {displayed.length === 0 && (
              <tr><td colSpan={7}><Empty icon={<Users size={26}/>} title="No patients found"/></td></tr>
            )}
            {displayed.map(p => {
              const risk = riskLevel(p);
              const adh  = Number(p.adherence_pct_7d);
              const adhC = isNaN(adh) ? 'var(--muted)' : adh >= 70 ? 'var(--green)' : adh >= 40 ? 'var(--amber)' : 'var(--rose)';
              return (
                <tr key={p.id} className="tbl-row" onClick={() => navigate(`/patients/${p.id}`)}>
                  <td>
                    <div style={{ display:'flex', alignItems:'center', gap:9 }}>
                      <div style={{ width:28, height:28, borderRadius:14, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, background:risk==='critical' ? 'rgba(232,64,96,0.14)' : risk==='warning' ? 'rgba(232,160,0,0.14)' : 'rgba(0,200,122,0.11)', color:risk==='critical' ? 'var(--rose)' : risk==='warning' ? 'var(--amber)' : 'var(--green)' }}>
                        {initials(p.first_name, p.last_name, p.email)}
                      </div>
                      <div>
                        <p style={{ fontSize:12, fontWeight:500, color:'var(--text)' }}>{p.first_name ? `${p.first_name} ${p.last_name??''}` : p.email}</p>
                        <p style={{ fontSize:10, color:'var(--muted)', maxWidth:170, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.email}</p>
                      </div>
                    </div>
                  </td>
                  <td><RiskBadge level={risk}/></td>
                  <td><GlucosePill value={p.latest_glucose} trend={p.trend_arrow}/></td>
                  <td>
                    {isNaN(adh) ? <span style={{ color:'var(--muted)' }}>—</span> : (
                      <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                        <div className="prog" style={{ width:64 }}><div className="prog-fill" style={{ width:`${adh}%`, background:adhC }}/></div>
                        <span style={{ fontFamily:'JetBrains Mono', fontSize:11, color:'var(--muted)' }}>{Math.round(adh)}%</span>
                      </div>
                    )}
                  </td>
                  <td>
                    {Number(p.open_urgent_alerts) > 0
                      ? <span className="badge b-red">{p.open_urgent_alerts} open</span>
                      : <span style={{ color:'var(--muted)', fontSize:12 }}>—</span>
                    }
                  </td>
                  <td style={{ fontFamily:'JetBrains Mono', fontSize:10, color:'var(--muted)' }}>{ago(p.last_cgm_at)}</td>
                  <td><span className="badge b-muted">{diabetesLabel(p.diabetes_type)}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
