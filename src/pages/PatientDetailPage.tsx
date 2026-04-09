import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format, subDays, addDays, parseISO } from 'date-fns';
import { useClinic } from '../hooks/ctx';
import { clinicianApi, protocolApi, usersApi, dlBlob } from '../services/api';
import { ago, fmtDate, fmtTime, diabetesLabel, glucoseColor, stepTypeColor, stepTypeLabel, initials } from '../utils/helpers';
import { PageLoad, Empty, Modal, Toast, Spin, Ring, GlucosePill, RiskBadge, StatCard, SectionHead, Field, Confirm } from '../components/common/UI';
import CGMChart from '../components/common/CGMChart';
import { ArrowLeft, Download, ChevronLeft, ChevronRight, Activity, Utensils, Syringe, Pill, Heart, CheckCircle, AlertTriangle, Clock, TrendingUp, ClipboardList, RefreshCw } from 'lucide-react';

type Win = '1d'|'7d'|'14d'|'30d';

const EICON: Record<string,any> = { meal:<Utensils size={11}/>, insulin:<Syringe size={11}/>, medication:<Pill size={11}/>, activity:<Activity size={11}/>, step:<CheckCircle size={11}/>, safety:<Heart size={11}/>, alert:<AlertTriangle size={11}/> };
const ECOLOR: Record<string,string> = { meal:'var(--amber)', insulin:'var(--cyan)', medication:'var(--purple)', activity:'var(--green)', step:'var(--green)', safety:'var(--rose)', alert:'var(--rose)' };

function TIRBar({ below, inRange, above }: { below:number; inRange:number; above:number }) {
  return (
    <div>
      <div style={{ display:'flex', height:7, borderRadius:4, overflow:'hidden', gap:1, marginBottom:7 }}>
        <div style={{ flex:Math.max(below,0.5), background:'var(--rose)' }} title={`Low ${below.toFixed(0)}%`}/>
        <div style={{ flex:Math.max(inRange,0.5), background:'var(--green)' }} title={`In range ${inRange.toFixed(0)}%`}/>
        <div style={{ flex:Math.max(above,0.5), background:'var(--amber)' }} title={`High ${above.toFixed(0)}%`}/>
      </div>
      <div style={{ display:'flex', gap:12 }}>
        {[{c:'var(--rose)',l:'Low',v:below},{c:'var(--green)',l:'In range',v:inRange},{c:'var(--amber)',l:'High',v:above}].map(x=>(
          <span key={x.l} style={{ display:'flex', alignItems:'center', gap:4, fontSize:10, color:'var(--muted)' }}>
            <span style={{ width:6, height:6, borderRadius:3, background:x.c, display:'inline-block' }}/>{x.l} {x.v.toFixed(0)}%
          </span>
        ))}
      </div>
    </div>
  );
}

export default function PatientDetailPage() {
  const { id }         = useParams<{ id:string }>();
  const navigate       = useNavigate();
  const { clinicId }   = useClinic();

  const [detail,    setDetail]    = useState<any>(null);
  const [cgm,       setCgm]       = useState<any[]>([]);
  const [timeline,  setTimeline]  = useState<any>(null);
  const [protocols, setProtocols] = useState<any[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [toast,     setToast]     = useState<{msg:string;type:'success'|'error'|'info'}|null>(null);
  const [cgmWin,    setCgmWin]    = useState<Win>('7d');
  const [tlDate,    setTlDate]    = useState(new Date().toISOString().slice(0,10));
  const [exporting, setExporting] = useState<string|null>(null);

  const [showThresh,  setShowThresh]  = useState(false);
  const [showAssign,  setShowAssign]  = useState(false);
  const [assignId,    setAssignId]    = useState('');
  const [confirmAssign, setConfirmAssign] = useState(false);

  const show = (msg:string, type:'success'|'error'|'info'='info') => setToast({msg,type});
  const today = new Date().toISOString().slice(0,10);

  // Load patient detail
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    clinicianApi.patient(id, clinicId)
      .then(r => setDetail(r.data.data))
      .catch(() => show('Failed to load patient.','error'))
      .finally(() => setLoading(false));
  }, [id, clinicId]);

  // Load CGM
  const loadCGM = useCallback(() => {
    if (!id) return;
    const days = cgmWin==='1d'?1:cgmWin==='7d'?7:cgmWin==='14d'?14:30;
    const to   = format(new Date(),'yyyy-MM-dd');
    const from = format(subDays(new Date(),days),'yyyy-MM-dd');
    clinicianApi.cgm(id, from, to, clinicId).then(r => setCgm(r.data.data ?? [])).catch(()=>{});
  }, [id, cgmWin, clinicId]);
  useEffect(() => { loadCGM(); }, [loadCGM]);

  // Load timeline
  useEffect(() => {
    if (!id) return;
    clinicianApi.timeline(id, tlDate, clinicId).then(r => setTimeline(r.data.data)).catch(()=>{});
  }, [id, tlDate, clinicId]);

  // Load protocols for assign modal
  useEffect(() => {
    if (!clinicId) return;
    protocolApi.list(clinicId).then(r => setProtocols((r.data.data ?? []).filter((p:any) => p.is_active))).catch(()=>{});
  }, [clinicId]);

  const exportPDF = async (w: string) => {
    if (!id) return;
    setExporting(w); show(`Generating ${w} PDF…`,'info');
    try {
      const r = await clinicianApi.exportPdf(id, w, clinicId);
      const name = `${detail?.profile?.first_name??'patient'}-${w}-${format(new Date(),'yyyy-MM-dd')}.pdf`.toLowerCase();
      dlBlob(r.data, name);
      show('PDF downloaded.','success');
    } catch { show('Export failed. Please retry.','error'); }
    finally { setExporting(null); }
  };

  const doAssign = async () => {
    if (!id || !assignId) return;
    try {
      await protocolApi.assign({ user_id:id, protocol_id:assignId, start_date:today });
      show('Protocol assigned successfully.','success');
      setShowAssign(false); setAssignId('');
      clinicianApi.patient(id, clinicId).then(r => setDetail(r.data.data));
    } catch (ex:any) { show(ex?.response?.data?.error ?? 'Failed to assign protocol.','error'); }
  };

  if (loading) return <PageLoad/>;
  if (!detail) return (
    <div style={{ padding:22 }}>
      <button className="btn btn-ghost btn-sm" onClick={() => navigate('/')} style={{ marginBottom:18 }}><ArrowLeft size={13}/> Roster</button>
      <Empty icon={<Activity size={26}/>} title="Patient not found"/>
    </div>
  );

  const p   = detail.profile ?? {};
  const m30 = detail.metrics?.windows?.['30d'];
  const cgm30 = m30?.cgm;
  const adh30 = m30?.adherence;
  const ri30  = m30?.reversal_index;
  const activeProto = detail.active_protocols?.[0];

  // Build timeline events
  const events = [
    ...(timeline?.meals          ?? []).map((e:any) => ({ ...e, etype:'meal',       time:e.logged_at,  label:`${e.meal_type?.toLowerCase()??'meal'} meal` })),
    ...(timeline?.medications    ?? []).map((e:any) => ({ ...e, etype:'medication', time:e.taken_at,   label:e.medication_name??'Medication' })),
    ...(timeline?.insulin_doses  ?? []).map((e:any) => ({ ...e, etype:'insulin',    time:e.taken_at,   label:`${e.units}u ${e.insulin_type??'insulin'}` })),
    ...(timeline?.activities     ?? []).map((e:any) => ({ ...e, etype:'activity',   time:e.logged_at,  label:`${e.activity_type??'Activity'}${e.duration_min?` · ${e.duration_min}min`:''}` })),
    ...(timeline?.step_completions??[]).map((e:any) => ({ ...e, etype:'step',       time:e.completed_at,label:e.title??'Protocol step' })),
  ].sort((a,b) => new Date(a.time).getTime()-new Date(b.time).getTime());

  return (
    <div className="page" style={{ padding:22, display:'flex', flexDirection:'column', gap:14 }}>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)}/>}

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/')}><ArrowLeft size={13}/> Roster</button>
          <div style={{ width:36, height:36, borderRadius:18, background:'linear-gradient(135deg,rgba(0,191,224,0.18),rgba(0,200,122,0.13))', border:'1px solid rgba(0,191,224,0.22)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, color:'var(--cyan)', flexShrink:0 }}>
            {initials(p.first_name, p.last_name, detail.email)}
          </div>
          <div>
            <h1 style={{ fontFamily:'Syne,sans-serif', fontSize:17, fontWeight:700, color:'var(--text)' }}>
              {p.first_name ? `${p.first_name} ${p.last_name??''}` : p.email}
            </h1>
            <p style={{ fontSize:11, color:'var(--muted)' }}>
              {diabetesLabel(p.diabetes_type)} · {detail.cgm_device?.provider ?? 'No CGM'} · Last seen {ago(p.last_login_at)}
            </p>
          </div>
        </div>
        <div style={{ display:'flex', gap:5 }}>
  {(['7d','30d','90d'] as const).map(w => (
    <button key={w} className="btn btn-ghost btn-sm" disabled={!!exporting} onClick={() => exportPDF(w)}>
      {exporting===w ? <Spin size={11}/> : <Download size={11}/>} {w} PDF
    </button>
  ))}
  <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/patients/${id}/meals`)}>   {/* ← ADD THIS */}
    <Utensils size={11}/> Meals
  </button>
  <button className="btn btn-primary btn-sm" onClick={() => setShowThresh(true)}>Set Thresholds</button>
</div>
      </div>

      {/* 6 stat cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:9 }}>
        <StatCard label="Mean Glucose"   value={cgm30?.mean_glucose ? Math.round(cgm30.mean_glucose) : '—'} sub="mg/dL" color={glucoseColor(cgm30?.mean_glucose)}/>
        <StatCard label="Est. HbA1c"    value={cgm30?.gmi ? `${cgm30.gmi.toFixed(1)}%` : '—'}              color="var(--amber)"/>
        <StatCard label="Time in Range" value={cgm30?.time_in_range_pct ? `${Math.round(cgm30.time_in_range_pct)}%` : '—'} sub="Target >70%" color="var(--green)"/>
        <StatCard label="Variability CV" value={cgm30?.cv_pct ? `${cgm30.cv_pct.toFixed(1)}%` : '—'}       sub="Target <36%" color="var(--muted)"/>
        <StatCard label="Adherence 30d" value={adh30?.score ?? '—'}                                         sub="/ 100"  color="var(--cyan)"/>
        <StatCard label="Reversal Index" value={ri30?.ri_score ?? '—'}                                       sub="/ 100"  color={ri30?.ri_score>=70?'var(--green)':ri30?.ri_score>=50?'var(--amber)':'var(--rose)'}/>
      </div>

      {/* CGM Chart */}
      <div className="card" style={{ padding:15 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:11 }}>
          <SectionHead icon={<Activity size={13}/>} title="CGM Trace" right={
            <div style={{ display:'flex', gap:3 }}>
              {(['1d','7d','14d','30d'] as const).map(w => (
                <button key={w} onClick={() => setCgmWin(w)}
                  style={{ padding:'3px 9px', borderRadius:6, fontSize:11, fontWeight:500, cursor:'pointer', border:cgmWin===w?'1px solid var(--border2)':'1px solid transparent', background:cgmWin===w?'var(--s3)':'transparent', color:cgmWin===w?'var(--cyan)':'var(--muted)', transition:'all 0.1s' }}>
                  {w}
                </button>
              ))}
              <button className="btn btn-ghost btn-sm" onClick={loadCGM} style={{ marginLeft:3 }}><RefreshCw size={10}/></button>
            </div>
          }/>
        </div>
        {cgm30 && <div style={{ marginBottom:10 }}><TIRBar below={cgm30.time_below_range_pct??0} inRange={cgm30.time_in_range_pct??0} above={cgm30.time_above_range_pct??0}/></div>}
        <CGMChart readings={cgm} height={210} lowThreshold={p.hypo_alert_warning??70} highThreshold={p.hyper_alert_warning??180}/>
        <p style={{ fontSize:10, color:'var(--muted)', marginTop:8 }}>{cgm.length} readings in window · Green band = target range · Thresholds shown as dashed lines</p>
      </div>

      {/* Bottom grid */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>

        {/* Day Timeline */}
        <div className="card" style={{ padding:15 }}>
          <SectionHead icon={<Clock size={13}/>} title="Day Timeline" right={
            <div style={{ display:'flex', alignItems:'center', gap:5 }}>
              <button className="btn btn-ghost btn-sm" style={{ padding:'3px 7px' }} onClick={() => setTlDate(format(subDays(parseISO(tlDate),1),'yyyy-MM-dd'))}><ChevronLeft size={12}/></button>
              <span style={{ fontSize:11, fontFamily:'JetBrains Mono', color:'var(--text)', minWidth:74, textAlign:'center' }}>{tlDate===today?'Today':fmtDate(tlDate,'dd MMM')}</span>
              <button className="btn btn-ghost btn-sm" style={{ padding:'3px 7px' }} disabled={tlDate>=today} onClick={() => setTlDate(format(addDays(parseISO(tlDate),1),'yyyy-MM-dd'))}><ChevronRight size={12}/></button>
            </div>
          }/>
          <div style={{ maxHeight:300, overflowY:'auto' }}>
            {events.length === 0
              ? <Empty icon={<Clock size={20}/>} title="No events" sub="No meals, meds, or activities recorded this day."/>
              : (
                <div style={{ position:'relative', paddingLeft:28 }}>
                  <div style={{ position:'absolute', left:9, top:0, bottom:0, width:1, background:'var(--border)' }}/>
                  {events.map((e,i) => (
                    <div key={i} style={{ position:'relative', marginBottom:11 }}>
                      <div style={{ position:'absolute', left:-19, width:20, height:20, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', background:`${ECOLOR[e.etype]}18`, color:ECOLOR[e.etype], border:`1px solid ${ECOLOR[e.etype]}38`, zIndex:1 }}>
                        {EICON[e.etype]}
                      </div>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                        <p style={{ fontSize:12, fontWeight:500, color:'var(--text)' }}>{e.label}</p>
                        <span style={{ fontSize:10, fontFamily:'JetBrains Mono', color:'var(--muted)', flexShrink:0, marginLeft:8 }}>{fmtTime(e.time)}</span>
                      </div>
                      {e.carb_estimate_g!=null && <p style={{ fontSize:10, color:'var(--muted)', marginTop:1 }}>C:{e.carb_estimate_g}g P:{e.protein_g??0}g F:{e.fat_g??0}g</p>}
                      {e.notes && <p style={{ fontSize:10, color:'var(--muted)', marginTop:1 }}>{e.notes}</p>}
                    </div>
                  ))}
                </div>
              )
            }
          </div>
        </div>

        {/* Right column */}
        <div style={{ display:'flex', flexDirection:'column', gap:11 }}>

          {/* Active Protocol */}
          <div className="card" style={{ padding:15 }}>
            <SectionHead icon={<ClipboardList size={13}/>} title="Active Protocol" right={
              <button className="btn btn-primary btn-sm" onClick={() => setShowAssign(true)}>
                {activeProto ? 'Change' : 'Assign'}
              </button>
            }/>
            {activeProto ? (
              <div>
                <p style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>{activeProto.protocol_name}</p>
                <p style={{ fontSize:11, color:'var(--muted)', marginTop:3 }}>v{activeProto.version} · Started {fmtDate(activeProto.start_date)}</p>
                {adh30 && (
                  <div style={{ marginTop:10 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                      <span style={{ fontSize:10, color:'var(--muted)' }}>Adherence (30d)</span>
                      <span style={{ fontSize:11, fontWeight:600, color:adh30.score>=70?'var(--green)':'var(--amber)' }}>{adh30.score}/100</span>
                    </div>
                    <div className="prog"><div className="prog-fill" style={{ width:`${adh30.score}%`, background:adh30.score>=70?'var(--green)':'var(--amber)' }}/></div>
                    {adh30.step_completion_pct != null && (
                      <p style={{ fontSize:10, color:'var(--muted)', marginTop:5 }}>
                        Step completion: {adh30.step_completion_pct.toFixed(0)}% · Logging: {adh30.logging_consistency_pct?.toFixed(0)??'—'}%
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <p style={{ fontSize:12, color:'var(--muted)', fontStyle:'italic' }}>No protocol assigned. Click Assign to get started.</p>
            )}
          </div>

          {/* Reversal Index */}
          {ri30?.ri_score != null && (
            <div className="card" style={{ padding:15 }}>
              <SectionHead icon={<TrendingUp size={13}/>} title="Reversal Index™ (30d)"/>
              <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                <Ring score={ri30.ri_score} size={72}/>
                <div style={{ flex:1, display:'flex', flexDirection:'column', gap:5 }}>
                  {[
                    { l:'Time in range', v:ri30.components?.tir_score??0,        max:40 },
                    { l:'Variability',   v:ri30.components?.cv_score??0,          max:20 },
                    { l:'Adherence',     v:ri30.components?.adherence_score??0,   max:25 },
                    { l:'Mean glucose',  v:ri30.components?.mean_score??0,        max:15 },
                  ].map(x => (
                    <div key={x.l}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:2 }}>
                        <span style={{ fontSize:10, color:'var(--muted)' }}>{x.l}</span>
                        <span style={{ fontSize:10, fontFamily:'JetBrains Mono', color:'var(--text)' }}>{x.v}/{x.max}</span>
                      </div>
                      <div className="prog"><div className="prog-fill" style={{ width:`${(x.v/x.max)*100}%`, background:'var(--cyan)' }}/></div>
                    </div>
                  ))}
                  {(ri30.components?.severe_low_penalty||ri30.components?.safety_penalty) && (
                    <p style={{ fontSize:10, color:'var(--rose)', marginTop:2 }}>
                      Penalties: {ri30.components.severe_low_penalty??0} low · {ri30.components.safety_penalty??0} safety
                    </p>
                  )}
                </div>
              </div>
              {ri30.interpretation && (
                <p style={{ fontSize:11, color:'var(--muted)', fontStyle:'italic', marginTop:10, padding:'7px 10px', borderRadius:7, background:'var(--s2)', lineHeight:1.55 }}>
                  {ri30.interpretation}
                </p>
              )}
            </div>
          )}

          {/* Recent Alerts */}
          <div className="card" style={{ padding:15, flex:1 }}>
            <SectionHead icon={<AlertTriangle size={13}/>} title="Recent Alerts"/>
            {!detail.recent_alerts?.length
              ? <p style={{ fontSize:12, color:'var(--muted)', fontStyle:'italic' }}>No recent alerts.</p>
              : <div style={{ maxHeight:160, overflowY:'auto', display:'flex', flexDirection:'column', gap:5 }}>
                  {detail.recent_alerts.slice(0,10).map((a:any) => (
                    <div key={a.id} style={{ display:'flex', alignItems:'flex-start', gap:8, paddingBottom:6, borderBottom:'1px solid var(--border)' }}>
                      <span className={`badge ${a.severity==='CRITICAL'?'b-red':a.severity==='URGENT'?'b-amber':'b-cyan'}`} style={{ fontSize:9, flexShrink:0 }}>{a.severity}</span>
                      <div style={{ flex:1 }}>
                        <p style={{ fontSize:11, fontWeight:500, color:'var(--text)' }}>{a.alert_type?.replace(/_/g,' ')}</p>
                        {a.glucose_value && <p style={{ fontSize:10, fontFamily:'JetBrains Mono', color:'var(--muted)' }}>{a.glucose_value} mg/dL</p>}
                      </div>
                      <span style={{ fontSize:10, color:'var(--muted)', flexShrink:0 }}>{ago(a.created_at)}</span>
                    </div>
                  ))}
                </div>
            }
          </div>
        </div>
      </div>

      {/* Safety Events */}
      {detail.safety_events?.length > 0 && (
        <div className="card" style={{ padding:15 }}>
          <SectionHead icon={<Heart size={13}/>} title="Safety Events"/>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {detail.safety_events.map((e:any) => (
              <div key={e.id} style={{ display:'flex', gap:10, padding:'8px 10px', borderRadius:8, background:'var(--s2)', border:'1px solid var(--border)' }}>
                <span style={{ fontSize:11, fontWeight:600, color:'var(--rose)' }}>{e.event_type?.replace(/_/g,' ')}</span>
                {e.notes && <span style={{ fontSize:11, color:'var(--muted)', flex:1 }}>{e.notes}</span>}
                <span style={{ fontSize:10, color:'var(--muted)', flexShrink:0 }}>{ago(e.occurred_at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Assign Protocol Modal */}
      <Modal open={showAssign} onClose={() => { setShowAssign(false); setAssignId(''); }} title="Assign Protocol">
        <p style={{ fontSize:12, color:'var(--muted)', marginBottom:13, lineHeight:1.65 }}>
          Assigning a new protocol will automatically deactivate the patient's current one.
          {activeProto && <><br/><strong style={{ color:'var(--amber)' }}>Current: {activeProto.protocol_name} v{activeProto.version}</strong></>}
        </p>
        {protocols.length === 0
          ? <Empty icon={<ClipboardList size={22}/>} title="No active protocols" sub="Go to Protocols page to create one."/>
          : <div style={{ display:'flex', flexDirection:'column', gap:7, marginBottom:14 }}>
              {protocols.map((pr:any) => (
                <button key={pr.id} onClick={() => setAssignId(pr.id)}
                  style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 12px', borderRadius:8, background:assignId===pr.id?'var(--cyan-bg)':'var(--s2)', border:`1px solid ${assignId===pr.id?'var(--cyan)':'var(--border)'}`, cursor:'pointer', transition:'all 0.12s', textAlign:'left' }}>
                  <div>
                    <p style={{ fontSize:12, fontWeight:500, color:'var(--text)' }}>{pr.name}</p>
                    <p style={{ fontSize:10, color:'var(--muted)' }}>v{pr.version}{pr.description?` · ${pr.description.slice(0,55)}`:''}  · {pr.steps?.length??0} steps</p>
                  </div>
                  {assignId===pr.id && <span className="badge b-cyan" style={{ fontSize:9 }}>Selected</span>}
                </button>
              ))}
            </div>
        }
        <div style={{ display:'flex', gap:7, justifyContent:'flex-end' }}>
          <button className="btn btn-ghost" onClick={() => { setShowAssign(false); setAssignId(''); }}>Cancel</button>
          <button className="btn btn-primary" disabled={!assignId} onClick={() => { setShowAssign(false); setConfirmAssign(true); }}>Assign Protocol</button>
        </div>
      </Modal>

      <Confirm open={confirmAssign} onClose={() => setConfirmAssign(false)} onConfirm={doAssign}
        title="Confirm Protocol Assignment"
        message="This will deactivate the patient's current protocol and assign the selected one starting today. This action is logged in the audit trail."
        confirmLabel="Assign Now"/>

      {/* Thresholds Modal */}
      <ThresholdModal open={showThresh} patientId={id!} current={p} onClose={() => setShowThresh(false)}
        onSaved={() => { show('Alert thresholds updated.','success'); clinicianApi.patient(id!, clinicId).then(r => setDetail(r.data.data)); }}/>
    </div>
  );
}

function ThresholdModal({ open, patientId, current, onClose, onSaved }: any) {
  const [v, setV] = useState({ hypo_urgent:'55', hypo_warning:'70', hyper_warning:'180', hyper_urgent:'250' });
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState('');

  useEffect(() => {
    if (open && current) setV({
      hypo_urgent:   String(current.hypo_alert_urgent   ?? 55),
      hypo_warning:  String(current.hypo_alert_warning  ?? 70),
      hyper_warning: String(current.hyper_alert_warning ?? 180),
      hyper_urgent:  String(current.hyper_alert_urgent  ?? 250),
    });
  }, [open, current]);

  const save = async () => {
    setSaving(true); setErr('');
    try {
      await usersApi.setThresholds(patientId, {
        hypo_urgent:   parseInt(v.hypo_urgent),
        hypo_warning:  parseInt(v.hypo_warning),
        hyper_warning: parseInt(v.hyper_warning),
        hyper_urgent:  parseInt(v.hyper_urgent),
      });
      onSaved(); onClose();
    } catch (ex:any) { setErr(ex?.response?.data?.error ?? 'Failed to save.'); }
    finally { setSaving(false); }
  };

  const fi = (label: string, key: string, ph: string) => (
    <Field label={label}>
      <input type="number" className="inp inp-sm" placeholder={ph} value={(v as any)[key]}
        onChange={e => setV(x => ({ ...x, [key]:e.target.value }))}/>
    </Field>
  );

  return (
    <Modal open={open} onClose={onClose} title="Set CGM Alert Thresholds" width={400}>
      <p style={{ fontSize:12, color:'var(--muted)', marginBottom:14, lineHeight:1.65 }}>
        Patient receives email alerts when CGM crosses these values (mg/dL).
      </p>
      <div style={{ display:'flex', flexDirection:'column', gap:9, marginBottom:14 }}>
        {fi('🔴 Hypo — Critical Low (urgent)',  'hypo_urgent',   '55')}
        {fi('🟠 Hypo — Low Warning',            'hypo_warning',  '70')}
        {fi('🟡 Hyper — High Warning',          'hyper_warning', '180')}
        {fi('🔴 Hyper — Critical High (urgent)','hyper_urgent',  '250')}
      </div>
      {err && <p style={{ fontSize:11, color:'var(--rose)', marginBottom:9 }}>{err}</p>}
      <div style={{ display:'flex', gap:7, justifyContent:'flex-end' }}>
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" disabled={saving} onClick={save}>{saving && <Spin size={13}/>} Save Thresholds</button>
      </div>
    </Modal>
  );
}
