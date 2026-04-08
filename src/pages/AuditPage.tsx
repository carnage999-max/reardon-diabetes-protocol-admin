import { useState, useEffect } from 'react';
import { auditApi } from '../services/api';
import { ago } from '../utils/helpers';
import { PageLoad, Empty, Toast } from '../components/common/UI';
import { Shield, Search, ChevronLeft, ChevronRight } from 'lucide-react';

function badgeFor(a: string) {
  if (a.includes('CREATE') || a.includes('REGISTER')) return 'b-green';
  if (a.includes('UPDATE') || a.includes('ASSIGN'))   return 'b-amber';
  if (a.includes('VIEW')   || a.includes('EXPORT'))   return 'b-cyan';
  if (a.includes('LOGIN')  || a.includes('LOGOUT'))   return 'b-muted';
  return 'b-muted';
}

export default function AuditPage() {
  const [logs,    setLogs]    = useState<any[]>([]);
  const [stats,   setStats]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast,   setToast]   = useState<{msg:string;type:'error'}|null>(null);
  const [search,  setSearch]  = useState('');
  const [action,  setAction]  = useState('');
  const [page,    setPage]    = useState(1);
  const PER = 50;

  useEffect(() => {
    Promise.all([
      auditApi.logs({ limit:200, action:action||undefined }),
      auditApi.stats(),
    ])
      .then(([l, s]) => {
        // backend returns { count, logs } or just the array
        const raw = l.data.data;
        setLogs(Array.isArray(raw) ? raw : (raw?.logs ?? []));
        setStats(s.data.data ?? []);
      })
      .catch(() => setToast({msg:'Failed to load audit log.',type:'error'}))
      .finally(() => setLoading(false));
  }, [action]);

  const filtered = logs.filter(l =>
    !search ||
    l.action?.toLowerCase().includes(search.toLowerCase()) ||
    l.actor_email?.toLowerCase().includes(search.toLowerCase()) ||
    l.resource_type?.toLowerCase().includes(search.toLowerCase())
  );
  const paged  = filtered.slice((page-1)*PER, page*PER);
  const pages  = Math.ceil(filtered.length / PER);
  const actions = [...new Set(logs.map(l => l.action))].sort() as string[];

  if (loading) return <PageLoad/>;

  return (
    <div className="page" style={{ padding:22 }}>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)}/>}

      <div style={{ marginBottom:18 }}>
        <h1 style={{ fontFamily:'Syne,sans-serif', fontSize:21, fontWeight:700, color:'var(--text)', display:'flex', alignItems:'center', gap:9 }}>
          <Shield size={19} color="var(--amber)"/> Audit Log
        </h1>
        <p style={{ fontSize:12, color:'var(--muted)', marginTop:3 }}>Immutable record of all clinical and system actions · HIPAA compliant</p>
      </div>

      {/* Action frequency */}
      {stats.length > 0 && (
        <div className="card" style={{ padding:13, marginBottom:14 }}>
          <p className="lbl" style={{ marginBottom:9 }}>Action frequency — last 30 days</p>
          <div style={{ display:'flex', flexWrap:'wrap', gap:7 }}>
            {stats.slice(0,12).map((s:any) => (
              <div key={s.action} style={{ display:'flex', alignItems:'center', gap:6, padding:'3px 9px', borderRadius:7, background:'var(--s2)', border:'1px solid var(--border)' }}>
                <span className={`badge ${badgeFor(s.action)}`} style={{ fontSize:9 }}>{s.action.replace(/_/g,' ')}</span>
                <span style={{ fontFamily:'JetBrains Mono', fontSize:11, fontWeight:700, color:'var(--text)' }}>{s.total}</span>
                <span style={{ fontSize:10, color:'var(--muted)' }}>· {s.unique_actors} actors</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display:'flex', gap:9, marginBottom:13 }}>
        <div style={{ position:'relative', flex:'0 0 210px' }}>
          <Search size={11} style={{ position:'absolute', left:9, top:'50%', transform:'translateY(-50%)', color:'var(--muted)' }}/>
          <input className="inp" placeholder="Search action, email…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} style={{ paddingLeft:27 }}/>
        </div>
        <select className="inp" value={action} onChange={e => { setAction(e.target.value); setPage(1); }} style={{ width:210 }}>
          <option value="">All actions</option>
          {actions.map(a => <option key={a} value={a}>{a.replace(/_/g,' ')}</option>)}
        </select>
        <span style={{ fontSize:11, color:'var(--muted)', alignSelf:'center', marginLeft:'auto' }}>{filtered.length} entries</span>
      </div>

      {/* Log table */}
      <div className="card" style={{ overflow:'hidden' }}>
        {paged.length === 0
          ? <Empty icon={<Shield size={24}/>} title="No audit entries match"/>
          : <div style={{ overflowX:'auto' }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Action</th>
                    <th>Actor</th>
                    <th>Role</th>
                    <th>Resource</th>
                    <th>Resource ID</th>
                    <th>IP</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((l:any) => (
                    <tr key={l.id} style={{ borderBottom:'1px solid var(--border)' }}>
                      <td style={{ fontFamily:'JetBrains Mono', fontSize:10, color:'var(--muted)', whiteSpace:'nowrap' }} title={l.created_at}>{ago(l.created_at)}</td>
                      <td><span className={`badge ${badgeFor(l.action)}`} style={{ fontSize:9 }}>{l.action?.replace(/_/g,' ')}</span></td>
                      <td style={{ fontSize:11, color:'var(--muted)', maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{l.actor_email ?? l.actor_id?.slice(0,12)+'…'}</td>
                      <td><span className={`badge ${l.actor_role==='ADMIN'?'b-amber':l.actor_role==='CLINICIAN'?'b-cyan':'b-muted'}`} style={{ fontSize:9 }}>{l.actor_role ?? '—'}</span></td>
                      <td style={{ fontSize:11, color:'var(--text)', whiteSpace:'nowrap' }}>{l.resource_type ?? '—'}</td>
                      <td style={{ fontFamily:'JetBrains Mono', fontSize:10, color:'var(--muted)' }}>{l.resource_id ? l.resource_id.slice(0,10)+'…' : '—'}</td>
                      <td style={{ fontFamily:'JetBrains Mono', fontSize:10, color:'var(--muted)' }}>{l.ip_address ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
        }
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:11 }}>
          <span style={{ fontSize:11, color:'var(--muted)' }}>Page {page} of {pages} · {filtered.length} entries</span>
          <div style={{ display:'flex', gap:5 }}>
            <button className="btn btn-ghost btn-sm" disabled={page===1} onClick={() => setPage(p => p-1)}><ChevronLeft size={12}/> Prev</button>
            <button className="btn btn-ghost btn-sm" disabled={page===pages} onClick={() => setPage(p => p+1)}>Next <ChevronRight size={12}/></button>
          </div>
        </div>
      )}
    </div>
  );
}
