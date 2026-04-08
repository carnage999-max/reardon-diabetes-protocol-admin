import { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';
import { glucoseColor, TREND_ARROW } from '../../utils/helpers';

// ── Spinner ───────────────────────────────────────────────────
export function Spin({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      style={{ animation: 'spin 0.7s linear infinite', flexShrink: 0 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <circle cx="12" cy="12" r="10" stroke="var(--faint)" strokeWidth="2.5"/>
      <path d="M12 2a10 10 0 0 1 10 10" stroke="var(--cyan)" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  );
}

// ── Page loader ───────────────────────────────────────────────
export function PageLoad() {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh' }}>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>
        <Spin size={26} />
        <p style={{ color:'var(--muted)', fontSize:12 }}>Loading…</p>
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────
export function Empty({ icon, title, sub }: { icon?: ReactNode; title: string; sub?: string }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:10, padding:'48px 24px' }}>
      {icon && <div style={{ color:'var(--faint)', opacity:0.5 }}>{icon}</div>}
      <p style={{ color:'var(--muted)', fontSize:13, fontWeight:600 }}>{title}</p>
      {sub && <p style={{ color:'var(--faint)', fontSize:12, textAlign:'center', maxWidth:280, lineHeight:1.5 }}>{sub}</p>}
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, width = 500 }: {
  open: boolean; onClose: () => void; title: string; children: ReactNode; width?: number;
}) {
  useEffect(() => {
    if (!open) return;
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div style={{ position:'fixed', inset:0, zIndex:60, display:'flex', alignItems:'center', justifyContent:'center', padding:16, background:'rgba(4,8,16,0.72)', backdropFilter:'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="card page" style={{ width:'100%', maxWidth:width, maxHeight:'90vh', display:'flex', flexDirection:'column' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 18px', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
          <p style={{ fontFamily:'Syne,sans-serif', fontSize:14, fontWeight:700, color:'var(--text)' }}>{title}</p>
          <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ padding:'3px 7px' }}><X size={13}/></button>
        </div>
        <div style={{ overflowY:'auto', padding:'18px 18px 22px', flex:1 }}>{children}</div>
      </div>
    </div>
  );
}

// ── Toast ─────────────────────────────────────────────────────
export function Toast({ msg, type = 'info', onClose }: { msg: string; type?: 'success'|'error'|'info'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
  const c = type === 'success' ? 'var(--green)' : type === 'error' ? 'var(--rose)' : 'var(--cyan)';
  return (
    <div style={{ position:'fixed', bottom:18, right:18, zIndex:100, display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderRadius:10, background:'var(--s2)', border:`1px solid ${c}40`, boxShadow:'0 6px 24px rgba(0,0,0,0.4)', maxWidth:360 }}>
      <div style={{ width:7, height:7, borderRadius:4, background:c, flexShrink:0 }}/>
      <span style={{ fontSize:12, color:'var(--text)', flex:1 }}>{msg}</span>
      <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--muted)', padding:0 }}><X size={12}/></button>
    </div>
  );
}

// ── Confirm dialog ────────────────────────────────────────────
export function Confirm({ open, title, message, confirmLabel = 'Confirm', danger, onConfirm, onClose }: {
  open: boolean; title: string; message: string; confirmLabel?: string;
  danger?: boolean; onConfirm: () => void; onClose: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} width={380}>
      <p style={{ fontSize:13, color:'var(--muted)', lineHeight:1.65, marginBottom:18 }}>{message}</p>
      <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={() => { onConfirm(); onClose(); }}>{confirmLabel}</button>
      </div>
    </Modal>
  );
}

// ── Field wrapper ─────────────────────────────────────────────
export function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
      <label className="lbl">{label}</label>
      {children}
      {error && <span style={{ fontSize:11, color:'var(--rose)' }}>{error}</span>}
    </div>
  );
}

// ── Risk badge ────────────────────────────────────────────────
export function RiskBadge({ level }: { level: 'critical'|'warning'|'ok' }) {
  if (level === 'critical') return <span className="badge b-red">⚠ Critical</span>;
  if (level === 'warning')  return <span className="badge b-amber">⚡ Attention</span>;
  return <span className="badge b-green">✓ Stable</span>;
}

// ── Glucose pill ──────────────────────────────────────────────
export function GlucosePill({ value, trend }: { value?: number|null; trend?: string|null }) {
  if (!value) return <span style={{ color:'var(--muted)' }}>—</span>;
  return (
    <span style={{ fontFamily:'JetBrains Mono,monospace', fontSize:13, fontWeight:600, color:glucoseColor(value), display:'inline-flex', alignItems:'center', gap:4 }}>
      {value}
      <span style={{ opacity:0.65, fontSize:11 }}>{TREND_ARROW[trend ?? ''] ?? '→'}</span>
      <span style={{ color:'var(--muted)', fontSize:10, fontWeight:400 }}>mg/dL</span>
    </span>
  );
}

// ── Progress ring ─────────────────────────────────────────────
export function Ring({ score, size = 76 }: { score: number; size?: number }) {
  const color  = score >= 75 ? 'var(--green)' : score >= 55 ? 'var(--cyan)' : score >= 35 ? 'var(--amber)' : 'var(--rose)';
  const r      = (size - 8) / 2;
  const circ   = 2 * Math.PI * r;
  const offset = circ - (Math.min(score, 100) / 100) * circ;
  return (
    <div style={{ position:'relative', width:size, height:size, flexShrink:0 }}>
      <svg width={size} height={size} style={{ transform:'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--faint)" strokeWidth="5"/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="5"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition:'stroke-dashoffset 0.5s ease', filter:`drop-shadow(0 0 4px ${color}80)` }}/>
      </svg>
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
        <span style={{ fontFamily:'Syne,sans-serif', fontSize:size*0.22, fontWeight:700, color, lineHeight:1 }}>{score}</span>
        <span style={{ fontSize:size*0.12, color:'var(--muted)' }}>/100</span>
      </div>
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────
export function StatCard({ label, value, sub, color = 'var(--cyan)' }: { label:string; value:any; sub?:string; color?:string }) {
  return (
    <div className="card2" style={{ padding:'12px 14px' }}>
      <p className="lbl" style={{ marginBottom:6 }}>{label}</p>
      <p style={{ fontFamily:'Syne,sans-serif', fontSize:20, fontWeight:700, color, lineHeight:1 }}>{value ?? '—'}</p>
      {sub && <p style={{ fontSize:10, color:'var(--muted)', marginTop:3 }}>{sub}</p>}
    </div>
  );
}

// ── Section header ────────────────────────────────────────────
export function SectionHead({ icon, title, right }: { icon?: ReactNode; title: string; right?: ReactNode }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
      <div style={{ display:'flex', alignItems:'center', gap:7 }}>
        {icon && <span style={{ color:'var(--cyan)' }}>{icon}</span>}
        <span style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>{title}</span>
      </div>
      {right}
    </div>
  );
}
