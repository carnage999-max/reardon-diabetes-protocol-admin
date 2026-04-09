import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format, subDays, parseISO, isValid } from 'date-fns';
import { useClinic } from '../hooks/ctx';
import http from '../services/api';
import { ago, fmtDate, fmtTime, glucoseColor } from '../utils/helpers';
import { PageLoad, Empty, Toast } from '../components/common/UI';
import {
  ArrowLeft, Utensils, Image, ChevronLeft, ChevronRight,
  Camera, RefreshCw, Filter,
} from 'lucide-react';

const MEAL_TYPE_LABEL: Record<string, string> = {
  BREAKFAST: 'Breakfast', LUNCH: 'Lunch', DINNER: 'Dinner',
  SNACK: 'Snack', OTHER: 'Other',
};
const MEAL_TYPE_COLOR: Record<string, string> = {
  BREAKFAST: '#F09030', LUNCH: '#30A860', DINNER: '#4080E0',
  SNACK: '#A060D0', OTHER: 'var(--muted)',
};

type WinOpt = '7d' | '14d' | '30d' | '90d';

function MacroPill({ label, value, unit, color }: { label: string; value?: number | null; unit: string; color: string }) {
  if (value == null) return null;
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:3, padding:'2px 8px', borderRadius:20, background:`${color}18`, border:`1px solid ${color}30`, fontSize:11, fontWeight:600, color }}>
      {label} {value}
      <span style={{ fontWeight:400, opacity:0.7 }}>{unit}</span>
    </span>
  );
}

function GlucoseContext({ pre, post }: { pre?: number | null; post?: number | null }) {
  if (!pre && !post) return null;
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, padding:'7px 10px', borderRadius:8, background:'var(--s2)', border:'1px solid var(--border)', marginTop:10 }}>
      <span style={{ fontSize:10, color:'var(--muted)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em' }}>CGM context</span>
      {pre != null && (
        <span style={{ fontSize:12, fontFamily:'JetBrains Mono', fontWeight:600, color:glucoseColor(pre) }}>
          Pre: {pre} <span style={{ fontSize:10, color:'var(--muted)', fontWeight:400 }}>mg/dL</span>
        </span>
      )}
      {pre != null && post != null && <span style={{ color:'var(--faint)', fontSize:12 }}>→</span>}
      {post != null && (
        <span style={{ fontSize:12, fontFamily:'JetBrains Mono', fontWeight:600, color:glucoseColor(post) }}>
          Post: {post} <span style={{ fontSize:10, color:'var(--muted)', fontWeight:400 }}>mg/dL</span>
        </span>
      )}
    </div>
  );
}

function MealCard({ meal, onPhotoClick }: { meal: any; onPhotoClick: (url: string, meal: any) => void }) {
  const typeColor = MEAL_TYPE_COLOR[meal.meal_type] ?? 'var(--muted)';
  const hasPhoto  = !!meal.photo_url;
  const totalCal  = meal.carb_estimate_g != null || meal.protein_g != null || meal.fat_g != null
    ? Math.round(((meal.carb_estimate_g ?? 0) * 4) + ((meal.protein_g ?? 0) * 4) + ((meal.fat_g ?? 0) * 9))
    : null;

  return (
    <div className="card" style={{ overflow:'hidden', transition:'box-shadow 0.15s' }}
      onMouseEnter={e => (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 1px var(--border2)'}
      onMouseLeave={e => (e.currentTarget as HTMLElement).style.boxShadow = ''}>

      {/* Photo */}
      {hasPhoto ? (
        <div style={{ position:'relative', height:160, background:'var(--s2)', cursor:'pointer', overflow:'hidden' }}
          onClick={() => onPhotoClick(meal.photo_url, meal)}>
          <img src={meal.photo_url} alt={`${MEAL_TYPE_LABEL[meal.meal_type] ?? meal.meal_type} meal`}
            style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }}
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <div style={{ position:'absolute', top:8, right:8, padding:'3px 8px', borderRadius:6, background:'rgba(0,0,0,0.55)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', gap:5, fontSize:11, color:'#fff' }}>
            <Camera size={11}/> Photo
          </div>
        </div>
      ) : (
        <div style={{ height:80, background:'var(--s2)', display:'flex', alignItems:'center', justifyContent:'center', borderBottom:'1px solid var(--border)' }}>
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:5, opacity:0.3 }}>
            <Image size={22} color="var(--muted)"/>
            <span style={{ fontSize:10, color:'var(--muted)' }}>No photo</span>
          </div>
        </div>
      )}

      <div style={{ padding:'11px 13px' }}>
        {/* Meal type + time */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
          <span style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'2px 9px', borderRadius:20, background:`${typeColor}15`, border:`1px solid ${typeColor}30`, fontSize:12, fontWeight:600, color:typeColor }}>
            <Utensils size={11}/> {MEAL_TYPE_LABEL[meal.meal_type] ?? meal.meal_type}
          </span>
          <span style={{ fontSize:11, fontFamily:'JetBrains Mono', color:'var(--muted)' }}>{fmtTime(meal.logged_at)}</span>
        </div>

        {/* Macros */}
        <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginBottom:6 }}>
          <MacroPill label="C" value={meal.carb_estimate_g} unit="g" color="#E8A000"/>
          <MacroPill label="P" value={meal.protein_g}       unit="g" color="#3090E0"/>
          <MacroPill label="F" value={meal.fat_g}           unit="g" color="#E06030"/>
          {totalCal != null && totalCal > 0 && (
            <span style={{ display:'inline-flex', alignItems:'center', padding:'2px 8px', borderRadius:20, background:'var(--s3)', border:'1px solid var(--border)', fontSize:11, color:'var(--muted)' }}>
              ~{totalCal} kcal
            </span>
          )}
        </div>

        {/* Notes */}
        {meal.notes && (
          <p style={{ fontSize:12, color:'var(--muted)', lineHeight:1.55, marginBottom:6, fontStyle:'italic' }}>
            "{meal.notes}"
          </p>
        )}

        {/* CGM context */}
        <GlucoseContext pre={meal.glucose_at_meal} post={meal.glucose_postmeal}/>
      </div>
    </div>
  );
}

export default function PatientMealsPage() {
  const { id }        = useParams<{ id: string }>();
  const navigate      = useNavigate();
  const { clinicId }  = useClinic();

  const [meals,    setMeals]    = useState<any[]>([]);
  const [patient,  setPatient]  = useState<any>(null);
  const [loading,  setLoading]  = useState(true);
  const [toast,    setToast]    = useState<{ msg:string; type:'error'|'info'|'success' }|null>(null);
  const [window,   setWindow]   = useState<WinOpt>('30d');
  const [filter,   setFilter]   = useState<string>('ALL');
  const [lightbox, setLightbox] = useState<{ url:string; meal:any }|null>(null);

  // Date range derived from window
  const toDate   = format(new Date(), 'yyyy-MM-dd');
  const fromDate = format(subDays(new Date(), window === '7d' ? 7 : window === '14d' ? 14 : window === '30d' ? 30 : 90), 'yyyy-MM-dd');

  const load = useCallback(() => {
    if (!id) return;
    setLoading(true);
    const cq = clinicId ? `&clinic_id=${clinicId}` : '';

    Promise.all([
      http.get(`/clinician/patients/${id}/meals?from=${fromDate}&to=${toDate}${cq}`),
      http.get(`/clinician/patients/${id}${clinicId ? `?clinic_id=${clinicId}` : ''}`),
    ])
      .then(([m, p]) => {
        setMeals(m.data.data ?? []);
        setPatient(p.data.data?.profile ?? null);
      })
      .catch(() => setToast({ msg:'Failed to load meals.', type:'error' }))
      .finally(() => setLoading(false));
  }, [id, clinicId, fromDate, toDate]);

  useEffect(() => { load(); }, [load]);

  // Filter by meal type
  const displayed = filter === 'ALL' ? meals : meals.filter(m => m.meal_type === filter);

  // Group by date for display
  const grouped = displayed.reduce((acc: Record<string, any[]>, meal) => {
    const d = meal.for_date?.slice(0, 10) ?? fmtDate(meal.logged_at, 'yyyy-MM-dd');
    if (!acc[d]) acc[d] = [];
    acc[d].push(meal);
    return acc;
  }, {});
  const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  const patientName = patient?.first_name
    ? `${patient.first_name} ${patient.last_name ?? ''}`.trim()
    : patient?.email ?? 'Patient';

  // Stats
  const withPhoto     = meals.filter(m => m.photo_url).length;
  const avgCarbs      = meals.filter(m => m.carb_estimate_g != null).length > 0
    ? Math.round(meals.filter(m => m.carb_estimate_g != null).reduce((s, m) => s + m.carb_estimate_g, 0) / meals.filter(m => m.carb_estimate_g != null).length)
    : null;
  const typeCounts    = meals.reduce((acc: Record<string, number>, m) => { acc[m.meal_type] = (acc[m.meal_type] ?? 0) + 1; return acc; }, {});

  if (loading) return <PageLoad/>;

  return (
    <div className="page" style={{ padding:22 }}>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)}/>}

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/patients/${id}`)}>
            <ArrowLeft size={13}/> Patient
          </button>
          <div>
            <h1 style={{ fontFamily:'Syne,sans-serif', fontSize:20, fontWeight:700, color:'var(--text)', display:'flex', alignItems:'center', gap:9 }}>
              <Utensils size={17} color="var(--amber)"/> Meal Log
            </h1>
            <p style={{ fontSize:12, color:'var(--muted)', marginTop:2 }}>{patientName} · {meals.length} meals logged</p>
          </div>
        </div>
        <div style={{ display:'flex', gap:6 }}>
          <button className="btn btn-ghost btn-sm" onClick={load}><RefreshCw size={12}/></button>
        </div>
      </div>

      {/* Stats bar */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:16 }}>
        {[
          { label:'Total Meals',   value:meals.length,            color:'var(--amber)' },
          { label:'With Photo',    value:`${withPhoto} / ${meals.length}`, color:'var(--cyan)' },
          { label:'Avg Carbs',     value:avgCarbs != null ? `${avgCarbs}g` : '—', color:'var(--amber)' },
          { label:'Days covered',  value:dates.length,            color:'var(--muted)' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding:'12px 14px' }}>
            <p className="lbl" style={{ marginBottom:5 }}>{s.label}</p>
            <p style={{ fontFamily:'Syne,sans-serif', fontSize:20, fontWeight:700, color:s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
        {/* Window selector */}
        <div style={{ display:'flex', gap:3 }}>
          {(['7d','14d','30d','90d'] as WinOpt[]).map(w => (
            <button key={w} onClick={() => setWindow(w)}
              style={{ padding:'4px 11px', borderRadius:6, fontSize:12, fontWeight:500, cursor:'pointer', border:window===w?'1px solid var(--border2)':'1px solid transparent', background:window===w?'var(--s3)':'transparent', color:window===w?'var(--text)':'var(--muted)', transition:'all 0.1s' }}>
              {w}
            </button>
          ))}
        </div>

        {/* Meal type filter */}
        <div style={{ display:'flex', gap:3, marginLeft:8 }}>
          {['ALL','BREAKFAST','LUNCH','DINNER','SNACK','OTHER'].map(f => {
            const color = f === 'ALL' ? 'var(--muted)' : MEAL_TYPE_COLOR[f] ?? 'var(--muted)';
            const cnt   = f === 'ALL' ? meals.length : (typeCounts[f] ?? 0);
            return (
              <button key={f} onClick={() => setFilter(f)}
                style={{ padding:'4px 10px', borderRadius:6, fontSize:11, fontWeight:500, cursor:'pointer', border:filter===f?`1px solid ${color}50`:'1px solid transparent', background:filter===f?`${color}15`:'transparent', color:filter===f?color:'var(--muted)', transition:'all 0.1s' }}>
                {f === 'ALL' ? 'All' : MEAL_TYPE_LABEL[f]} {cnt > 0 && <span style={{ opacity:0.6 }}>({cnt})</span>}
              </button>
            );
          })}
        </div>

        <span style={{ fontSize:11, color:'var(--muted)', marginLeft:'auto' }}>{displayed.length} shown · {fromDate} – {toDate}</span>
      </div>

      {/* Meal grid grouped by date */}
      {dates.length === 0 ? (
        <div className="card" style={{ padding:24 }}>
          <Empty icon={<Utensils size={28}/>} title="No meals logged" sub={`No meal logs found for the selected ${window} window.`}/>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
          {dates.map(date => {
            const dayMeals = grouped[date];
            const parsed   = parseISO(date);
            const dayLabel = isValid(parsed) ? format(parsed, 'EEEE, d MMMM yyyy') : date;
            const isToday  = date === format(new Date(), 'yyyy-MM-dd');

            return (
              <div key={date}>
                {/* Date header */}
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ fontFamily:'Syne,sans-serif', fontSize:13, fontWeight:700, color:'var(--text)' }}>{dayLabel}</span>
                    {isToday && <span className="badge b-cyan" style={{ fontSize:9 }}>Today</span>}
                    <span style={{ fontSize:11, color:'var(--muted)' }}>· {dayMeals.length} meal{dayMeals.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div style={{ flex:1, height:1, background:'var(--border)' }}/>
                </div>

                {/* Cards grid */}
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(240px, 1fr))', gap:12 }}>
                  {dayMeals.map((meal: any) => (
                    <MealCard key={meal.id} meal={meal}
                      onPhotoClick={(url, m) => setLightbox({ url, meal:m })}/>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div onClick={() => setLightbox(null)}
          style={{ position:'fixed', inset:0, zIndex:80, background:'rgba(0,0,0,0.88)', display:'flex', alignItems:'center', justifyContent:'center', padding:24, cursor:'zoom-out' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ display:'flex', gap:20, alignItems:'flex-start', maxWidth:900, width:'100%' }}>
            {/* Photo */}
            <div style={{ flex:'0 0 auto', maxWidth:520, borderRadius:14, overflow:'hidden', boxShadow:'0 8px 40px rgba(0,0,0,0.6)' }}>
              <img src={lightbox.url} alt="Meal photo"
                style={{ width:'100%', maxHeight:'75vh', objectFit:'contain', display:'block' }}/>
            </div>
            {/* Details */}
            <div className="card" style={{ flex:1, padding:18, minWidth:220 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
                <span style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'3px 10px', borderRadius:20, background:`${MEAL_TYPE_COLOR[lightbox.meal.meal_type] ?? 'var(--muted)'}18`, color:MEAL_TYPE_COLOR[lightbox.meal.meal_type] ?? 'var(--muted)', border:`1px solid ${MEAL_TYPE_COLOR[lightbox.meal.meal_type] ?? 'var(--border)'}35`, fontSize:13, fontWeight:600 }}>
                  <Utensils size={12}/> {MEAL_TYPE_LABEL[lightbox.meal.meal_type] ?? lightbox.meal.meal_type}
                </span>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                <div>
                  <p className="lbl" style={{ marginBottom:2 }}>Date & time</p>
                  <p style={{ fontSize:12, color:'var(--text)' }}>{fmtDate(lightbox.meal.for_date)} · {fmtTime(lightbox.meal.logged_at)}</p>
                </div>
                {(lightbox.meal.carb_estimate_g != null || lightbox.meal.protein_g != null || lightbox.meal.fat_g != null) && (
                  <div>
                    <p className="lbl" style={{ marginBottom:5 }}>Macros</p>
                    <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                      <MacroPill label="Carbs"   value={lightbox.meal.carb_estimate_g} unit="g" color="#E8A000"/>
                      <MacroPill label="Protein" value={lightbox.meal.protein_g}       unit="g" color="#3090E0"/>
                      <MacroPill label="Fat"     value={lightbox.meal.fat_g}           unit="g" color="#E06030"/>
                    </div>
                  </div>
                )}
                {lightbox.meal.notes && (
                  <div>
                    <p className="lbl" style={{ marginBottom:2 }}>Notes</p>
                    <p style={{ fontSize:12, color:'var(--muted)', lineHeight:1.6, fontStyle:'italic' }}>"{lightbox.meal.notes}"</p>
                  </div>
                )}
                <GlucoseContext pre={lightbox.meal.glucose_at_meal} post={lightbox.meal.glucose_postmeal}/>
              </div>
              <button className="btn btn-ghost btn-sm" style={{ marginTop:16, width:'100%' }} onClick={() => setLightbox(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
