import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClinic } from '../hooks/ctx';
import { protocolApi, clinicianApi } from '../services/api';
import { fmtDate, stepTypeLabel, stepTypeColor, dayLabels, snakeKey } from '../utils/helpers';
import { PageLoad, Empty, Modal, Toast, Spin, Field } from '../components/common/UI';
import { ClipboardList, Plus, ChevronRight, Users, CheckCircle, Clock, ToggleLeft, Info } from 'lucide-react';

const STEP_TYPES = ['GLUCOSE_CHECK','MEDICATION','MEAL_LOG','ACTIVITY','WELLNESS','EDUCATION','CUSTOM'];
const ALL_DAYS   = [0,1,2,3,4,5,6];
const DAY_NAMES  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

export default function ProtocolsPage() {
  const { clinicId }   = useClinic();
  const navigate       = useNavigate();
  const [protocols, setProtocols] = useState<any[]>([]);
  const [selected,  setSelected]  = useState<any | null>(null);
  const [patients,  setPatients]  = useState<any[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [toast,     setToast]     = useState<{ msg:string; type:'success'|'error'|'info' }|null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showStep,   setShowStep]   = useState(false);
  const [showAssign, setShowAssign] = useState(false);

  const show = (msg:string, type:'success'|'error'|'info'='info') => setToast({msg,type});

  const loadList = () => {
    if (!clinicId) return;
    protocolApi.list(clinicId).then(r => {
      const list = r.data.data ?? [];
      setProtocols(list);
      // Refresh selected if still in list
      if (selected) {
        const found = list.find((p:any) => p.id === selected.id);
        if (found) loadDetail(found.id);
      }
    }).catch(() => {});
  };

  const loadDetail = (id: string) => {
    protocolApi.get(id, clinicId).then(r => setSelected(r.data.data)).catch(() => {});
  };

  useEffect(() => {
    if (!clinicId) return;
    Promise.all([protocolApi.list(clinicId), clinicianApi.roster(clinicId)])
      .then(([pr, ro]) => { setProtocols(pr.data.data ?? []); setPatients(ro.data.data ?? []); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [clinicId]);

  if (loading) return <PageLoad/>;

  return (
    <div className="page" style={{ padding:22, display:'flex', flexDirection:'column', height:'calc(100vh - 0px)' }}>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)}/>}

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
        <div>
          <h1 style={{ fontFamily:'Syne,sans-serif', fontSize:21, fontWeight:700, color:'var(--text)' }}>Protocols</h1>
          <p style={{ fontSize:12, color:'var(--muted)', marginTop:3 }}>Build and assign treatment protocols to patients · {protocols.length} protocols</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}><Plus size={13}/> New Protocol</button>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'260px 1fr', gap:12, flex:1, minHeight:0, overflow:'hidden' }}>

        {/* List */}
        <div style={{ overflowY:'auto', display:'flex', flexDirection:'column', gap:5 }}>
          {protocols.length === 0 && (
            <div className="card" style={{ padding:18 }}>
              <Empty icon={<ClipboardList size={22}/>} title="No protocols yet" sub="Create your first protocol to assign to patients."/>
            </div>
          )}
          {protocols.map((pr:any) => (
            <button key={pr.id} onClick={() => loadDetail(pr.id)}
              style={{ display:'flex', alignItems:'flex-start', gap:9, padding:'11px 13px', borderRadius:10, cursor:'pointer', background:selected?.id===pr.id ? 'var(--cyan-bg)' : 'var(--surface)', border:`1px solid ${selected?.id===pr.id ? 'var(--cyan)' : 'var(--border)'}`, textAlign:'left', transition:'all 0.12s' }}>
              <div style={{ width:30, height:30, borderRadius:8, background:selected?.id===pr.id ? 'var(--cyan-bg)' : 'var(--s2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <ClipboardList size={13} color={selected?.id===pr.id ? 'var(--cyan)' : 'var(--muted)'}/>
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                  <p style={{ fontSize:12, fontWeight:600, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1 }}>{pr.name}</p>
                  {!pr.is_active && <span className="badge b-muted" style={{ fontSize:9 }}>inactive</span>}
                </div>
                <p style={{ fontSize:10, color:'var(--muted)', marginTop:2 }}>v{pr.version} · {pr.steps?.length??'?'} steps · {fmtDate(pr.created_at)}</p>
              </div>
              {selected?.id===pr.id && <ChevronRight size={11} color="var(--cyan)" style={{ flexShrink:0, marginTop:4 }}/>}
            </button>
          ))}
        </div>

        {/* Detail panel */}
        {selected ? (
          <div style={{ display:'flex', flexDirection:'column', gap:11, overflowY:'auto' }}>

            {/* Protocol header */}
            <div className="card" style={{ padding:15 }}>
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
                <div style={{ flex:1 }}>
                  <h2 style={{ fontFamily:'Syne,sans-serif', fontSize:15, fontWeight:700, color:'var(--text)' }}>{selected.name}</h2>
                  <p style={{ fontSize:11, color:'var(--muted)', marginTop:3 }}>Version {selected.version} · Created {fmtDate(selected.created_at)}</p>
                  {selected.description && <p style={{ fontSize:12, color:'var(--muted)', marginTop:7, lineHeight:1.6 }}>{selected.description}</p>}
                </div>
                <div style={{ display:'flex', gap:6, flexShrink:0, marginLeft:12 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => setShowAssign(true)}><Users size={11}/> Assign to Patient</button>
                  <button className="btn btn-primary btn-sm" onClick={() => setShowStep(true)}><Plus size={11}/> Add Step</button>
                </div>
              </div>
              <div style={{ display:'flex', gap:18, marginTop:12, paddingTop:12, borderTop:'1px solid var(--border)' }}>
                {[
                  { label:'Total Steps',   value:selected.steps?.length ?? 0,                          color:'var(--cyan)'  },
                  { label:'Required',      value:selected.steps?.filter((s:any)=>s.is_required).length??0, color:'var(--text)'  },
                  { label:'Optional',      value:selected.steps?.filter((s:any)=>!s.is_required).length??0,color:'var(--muted)' },
                  { label:'Status',        value:selected.is_active ? '✓ Active' : '✗ Inactive',       color:selected.is_active?'var(--green)':'var(--muted)' },
                ].map(x => (
                  <div key={x.label}>
                    <p className="lbl" style={{ marginBottom:3 }}>{x.label}</p>
                    <p style={{ fontFamily:'Syne,sans-serif', fontSize:16, fontWeight:700, color:x.color }}>{x.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Steps */}
            <div className="card" style={{ overflow:'hidden', flex:1 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'11px 15px', borderBottom:'1px solid var(--border)', background:'var(--s2)' }}>
                <span style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>Protocol Steps</span>
                <button className="btn btn-primary btn-sm" onClick={() => setShowStep(true)}><Plus size={11}/> Add Step</button>
              </div>
              {!selected.steps?.length
                ? <Empty icon={<CheckCircle size={22}/>} title="No steps yet" sub="Click 'Add Step' to build out this protocol."/>
                : <div style={{ overflowY:'auto', maxHeight:'calc(100vh - 360px)' }}>
                    {selected.steps.map((s:any, i:number) => (
                      <div key={s.id} style={{ display:'flex', alignItems:'flex-start', gap:11, padding:'12px 15px', borderBottom:i<selected.steps.length-1?'1px solid var(--border)':'none' }}>
                        {/* Number + type color */}
                        <div style={{ width:30, height:30, borderRadius:8, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, background:`${stepTypeColor(s.step_type)}14`, color:stepTypeColor(s.step_type), border:`1px solid ${stepTypeColor(s.step_type)}28` }}>
                          {String(i+1).padStart(2,'0')}
                        </div>
                        <div style={{ flex:1 }}>
                          <div style={{ display:'flex', alignItems:'center', gap:7, flexWrap:'wrap' }}>
                            <p style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>{s.title}</p>
                            <span style={{ fontSize:10, padding:'1px 7px', borderRadius:20, background:`${stepTypeColor(s.step_type)}14`, color:stepTypeColor(s.step_type), border:`1px solid ${stepTypeColor(s.step_type)}28`, fontWeight:600 }}>
                              {stepTypeLabel(s.step_type)}
                            </span>
                            {!s.is_required && <span className="badge b-muted" style={{ fontSize:9 }}>optional</span>}
                          </div>
                          {s.description && <p style={{ fontSize:11, color:'var(--muted)', marginTop:3, lineHeight:1.55 }}>{s.description}</p>}
                          <div style={{ display:'flex', gap:14, marginTop:5, flexWrap:'wrap' }}>
                            <span style={{ fontSize:10, color:'var(--muted)', display:'flex', alignItems:'center', gap:4 }}>
                              <Clock size={10}/> {dayLabels(s.schedule_days)}
                            </span>
                            {s.schedule_time && <span style={{ fontSize:10, color:'var(--muted)', fontFamily:'JetBrains Mono' }}>@ {s.schedule_time}</span>}
                            <span style={{ fontSize:10, color:'var(--muted)' }}>Weight: {s.weight}</span>
                            <span style={{ fontSize:10, color:'var(--muted)', fontFamily:'JetBrains Mono', opacity:0.6 }}>key: {s.step_key}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
              }
            </div>
          </div>
        ) : (
          <div className="card" style={{ display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Empty icon={<ClipboardList size={26}/>} title="Select a protocol" sub="Click any protocol on the left to view and manage its steps."/>
          </div>
        )}
      </div>

      {/* Modals */}
      <CreateProtocolModal open={showCreate} clinicId={clinicId}
        onClose={() => setShowCreate(false)}
        onCreated={(pr:any) => { setSelected(pr); loadList(); setShowCreate(false); show('Protocol created.','success'); }}/>

      {selected && (
        <AddStepModal open={showStep} protocolId={selected.id} clinicId={clinicId}
          onClose={() => setShowStep(false)}
          onAdded={() => { loadDetail(selected.id); setShowStep(false); show('Step added.','success'); }}/>
      )}

      {selected && (
        <AssignModal open={showAssign} protocol={selected} patients={patients}
          onClose={() => setShowAssign(false)}
          onAssigned={(name:string) => { setShowAssign(false); show(`Protocol assigned to ${name}.`,'success'); }}/>
      )}
    </div>
  );
}

// ── Create Protocol ───────────────────────────────────────────
function CreateProtocolModal({ open, clinicId, onClose, onCreated }: any) {
  const [form, setForm] = useState({ name:'', description:'', version:'1.0' });
  const [busy, setBusy] = useState(false);
  const [err,  setErr]  = useState('');

  const submit = async () => {
    if (!form.name.trim()) { setErr('Protocol name is required.'); return; }
    setBusy(true); setErr('');
    try {
      const r = await protocolApi.create(
        { name:form.name.trim(), description:form.description||undefined, version:form.version||'1.0' },
        clinicId
      );
      onCreated(r.data.data);
      setForm({ name:'', description:'', version:'1.0' });
    } catch (ex:any) { setErr(ex?.response?.data?.error ?? 'Failed to create protocol.'); }
    finally { setBusy(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Create New Protocol" width={440}>
      <div style={{ display:'flex', flexDirection:'column', gap:11, marginBottom:15 }}>
        <Field label="Protocol name *">
          <input className="inp" placeholder="e.g. T2D Reversal Phase 1" value={form.name}
            onChange={e => setForm(v => ({ ...v, name:e.target.value }))}/>
        </Field>
        <Field label="Description">
          <textarea className="inp" rows={3} placeholder="Brief description of goals and intended patient cohort…"
            value={form.description} onChange={e => setForm(v => ({ ...v, description:e.target.value }))}/>
        </Field>
        <Field label="Version">
          <input className="inp inp-sm" placeholder="1.0" value={form.version}
            onChange={e => setForm(v => ({ ...v, version:e.target.value }))} style={{ width:90 }}/>
        </Field>
      </div>
      <div style={{ padding:'9px 11px', borderRadius:8, background:'var(--s3)', border:'1px solid var(--border)', marginBottom:14, display:'flex', gap:8, alignItems:'flex-start' }}>
        <Info size={12} color="var(--muted)" style={{ flexShrink:0, marginTop:1 }}/>
        <p style={{ fontSize:11, color:'var(--muted)', lineHeight:1.5 }}>After creating the protocol, add steps using the Step builder. Then assign it to patients from the protocol detail view or from the patient detail page.</p>
      </div>
      {err && <p style={{ fontSize:11, color:'var(--rose)', marginBottom:10 }}>{err}</p>}
      <div style={{ display:'flex', gap:7, justifyContent:'flex-end' }}>
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" disabled={busy} onClick={submit}>{busy && <Spin size={12}/>} Create Protocol</button>
      </div>
    </Modal>
  );
}

// ── Add Step ──────────────────────────────────────────────────
function AddStepModal({ open, protocolId, clinicId, onClose, onAdded }: any) {
  const def = { step_key:'', title:'', description:'', step_type:'GLUCOSE_CHECK', schedule_days:ALL_DAYS, schedule_time:'', is_required:true, weight:1, sort_order:0 };
  const [form, setForm] = useState({ ...def });
  const [busy, setBusy] = useState(false);
  const [err,  setErr]  = useState('');

  const toggle = (d:number) => setForm(v => ({
    ...v,
    schedule_days: v.schedule_days.includes(d) ? v.schedule_days.filter(x => x!==d) : [...v.schedule_days, d].sort((a,b)=>a-b)
  }));

  const submit = async () => {
    if (!form.title.trim())    { setErr('Title is required.'); return; }
    if (!form.step_key.trim()) { setErr('Step key is required.'); return; }
    if (!form.schedule_days.length) { setErr('Select at least one day.'); return; }
    setBusy(true); setErr('');
    try {
      await protocolApi.addStep(protocolId, { ...form, schedule_time:form.schedule_time||undefined, config:{} }, clinicId);
      onAdded();
      setForm({ ...def });
    } catch (ex:any) { setErr(ex?.response?.data?.error ?? 'Failed to add step.'); }
    finally { setBusy(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Add Protocol Step" width={520}>
      <div style={{ display:'flex', flexDirection:'column', gap:11, marginBottom:14 }}>
        <Field label="Step title *">
          <input className="inp" placeholder="e.g. Morning glucose check" value={form.title}
            onChange={e => { const t = e.target.value; setForm(v => ({ ...v, title:t, step_key:snakeKey(t) })); }}/>
        </Field>
        <Field label="Step key (auto-generated · snake_case · used in audit logs)">
          <input className="inp inp-sm" value={form.step_key}
            onChange={e => setForm(v => ({ ...v, step_key:e.target.value.toLowerCase().replace(/[^a-z0-9_]/g,'_') }))}
            style={{ fontFamily:'JetBrains Mono', fontSize:12 }} placeholder="morning_glucose_check"/>
        </Field>
        <Field label="Step type *">
          <select className="inp" value={form.step_type} onChange={e => setForm(v => ({ ...v, step_type:e.target.value }))}>
            {STEP_TYPES.map(t => <option key={t} value={t}>{stepTypeLabel(t)}</option>)}
          </select>
        </Field>
        <Field label="Description (shown to patient in app)">
          <textarea className="inp" rows={2} placeholder="Instructions for the patient…" value={form.description}
            onChange={e => setForm(v => ({ ...v, description:e.target.value }))}/>
        </Field>
        <Field label="Schedule — days of week">
          <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
            {DAY_NAMES.map((d,i) => (
              <button key={i} type="button" onClick={() => toggle(i)}
                style={{ padding:'4px 9px', borderRadius:6, fontSize:11, fontWeight:500, cursor:'pointer', background:form.schedule_days.includes(i)?'var(--cyan-bg)':'var(--s3)', border:form.schedule_days.includes(i)?'1px solid var(--cyan)':'1px solid var(--border)', color:form.schedule_days.includes(i)?'var(--cyan)':'var(--muted)', transition:'all 0.1s' }}>
                {d}
              </button>
            ))}
            <button type="button" onClick={() => setForm(v => ({ ...v, schedule_days:v.schedule_days.length===7?[]:ALL_DAYS }))}
              style={{ padding:'4px 9px', borderRadius:6, fontSize:11, cursor:'pointer', background:'transparent', border:'1px solid var(--border)', color:'var(--muted)' }}>
              {form.schedule_days.length===7 ? 'Clear' : 'All'}
            </button>
          </div>
        </Field>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:9 }}>
          <Field label="Time (HH:MM, optional)">
            <input className="inp inp-sm" placeholder="08:00" value={form.schedule_time}
              onChange={e => setForm(v => ({ ...v, schedule_time:e.target.value }))}/>
          </Field>
          <Field label="Weight (0–10)">
            <input type="number" className="inp inp-sm" min={0} max={10} step={0.5} value={form.weight}
              onChange={e => setForm(v => ({ ...v, weight:parseFloat(e.target.value)||1 }))}/>
          </Field>
          <Field label="Sort order">
            <input type="number" className="inp inp-sm" value={form.sort_order}
              onChange={e => setForm(v => ({ ...v, sort_order:parseInt(e.target.value)||0 }))}/>
          </Field>
        </div>
        {/* Required toggle */}
        <div style={{ display:'flex', alignItems:'center', gap:9, padding:'9px 11px', borderRadius:8, background:'var(--s3)', border:'1px solid var(--border)', cursor:'pointer' }}
          onClick={() => setForm(v => ({ ...v, is_required:!v.is_required }))}>
          <div style={{ width:32, height:18, borderRadius:9, background:form.is_required?'var(--cyan)':'var(--faint)', position:'relative', transition:'background 0.15s', flexShrink:0 }}>
            <div style={{ position:'absolute', width:14, height:14, borderRadius:7, background:'white', top:2, left:form.is_required?16:2, transition:'left 0.15s' }}/>
          </div>
          <div>
            <p style={{ fontSize:12, fontWeight:500, color:'var(--text)' }}>{form.is_required ? 'Required step' : 'Optional step'}</p>
            <p style={{ fontSize:10, color:'var(--muted)' }}>{form.is_required ? 'Counted in adherence score' : 'Not penalised if skipped'}</p>
          </div>
        </div>
      </div>
      {err && <p style={{ fontSize:11, color:'var(--rose)', marginBottom:9 }}>{err}</p>}
      <div style={{ display:'flex', gap:7, justifyContent:'flex-end' }}>
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" disabled={busy} onClick={submit}>{busy && <Spin size={12}/>} Add Step</button>
      </div>
    </Modal>
  );
}

// ── Assign to Patient ─────────────────────────────────────────
function AssignModal({ open, protocol, patients, onClose, onAssigned }: any) {
  const [pid,   setPid]   = useState('');
  const [start, setStart] = useState(new Date().toISOString().slice(0,10));
  const [busy,  setBusy]  = useState(false);
  const [err,   setErr]   = useState('');

  const assign = async () => {
    if (!pid) { setErr('Select a patient.'); return; }
    setBusy(true); setErr('');
    try {
      await protocolApi.assign({ user_id:pid, protocol_id:protocol.id, start_date:start });
      const pt = patients.find((p:any) => p.id === pid);
      onAssigned(pt ? `${pt.first_name??''} ${pt.last_name??''}`.trim() || pt.email : 'patient');
      setPid(''); setStart(new Date().toISOString().slice(0,10));
    } catch (ex:any) { setErr(ex?.response?.data?.error ?? 'Failed to assign protocol.'); }
    finally { setBusy(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title={`Assign "${protocol.name}" to Patient`} width={440}>
      <p style={{ fontSize:12, color:'var(--muted)', marginBottom:13, lineHeight:1.65 }}>
        The patient's currently active protocol will be deactivated. This action is logged in the audit trail.
      </p>
      <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:14 }}>
        <Field label="Select patient *">
          <select className="inp" value={pid} onChange={e => setPid(e.target.value)}>
            <option value="">— Choose a patient —</option>
            {patients.map((p:any) => (
              <option key={p.id} value={p.id}>
                {p.first_name ? `${p.first_name} ${p.last_name??''}` : p.email}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Start date">
          <input type="date" className="inp inp-sm" value={start} onChange={e => setStart(e.target.value)} style={{ width:180 }}/>
        </Field>
      </div>
      {err && <p style={{ fontSize:11, color:'var(--rose)', marginBottom:9 }}>{err}</p>}
      <div style={{ display:'flex', gap:7, justifyContent:'flex-end' }}>
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" disabled={busy||!pid} onClick={assign}>{busy && <Spin size={12}/>} Assign Protocol</button>
      </div>
    </Modal>
  );
}
