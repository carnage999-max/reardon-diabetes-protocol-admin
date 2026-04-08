import { useMemo } from 'react';
import {
  ResponsiveContainer, ComposedChart, Area, Line,
  XAxis, YAxis, Tooltip, ReferenceLine, ReferenceArea, CartesianGrid,
} from 'recharts';
import { format, parseISO } from 'date-fns';

interface Reading { reading_at: string; glucose_mgdl: number; trend_arrow?: string }

const Tip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const v = payload[0]?.value;
  const c = v < 70 ? 'var(--rose)' : v > 180 ? 'var(--amber)' : 'var(--green)';
  return (
    <div style={{ background:'var(--s2)', border:'1px solid var(--border2)', borderRadius:8, padding:'7px 12px' }}>
      <p style={{ fontSize:10, color:'var(--muted)', marginBottom:2 }}>{payload[0]?.payload?.t}</p>
      <p style={{ fontFamily:'JetBrains Mono', fontSize:14, fontWeight:600, color:c }}>
        {v} <span style={{ color:'var(--muted)', fontSize:10, fontWeight:400 }}>mg/dL</span>
      </p>
    </div>
  );
};

export default function CGMChart({ readings, lowThreshold = 70, highThreshold = 180, height = 220 }: {
  readings: Reading[]; lowThreshold?: number; highThreshold?: number; height?: number;
}) {
  const data = useMemo(() => readings.map(r => ({
    t: format(parseISO(r.reading_at), 'HH:mm'),
    g: r.glucose_mgdl,
  })), [readings]);

  if (!data.length) return (
    <div style={{ height, display:'flex', alignItems:'center', justifyContent:'center', borderRadius:10, background:'var(--s2)', border:'1px solid var(--border)' }}>
      <p style={{ color:'var(--muted)', fontSize:12 }}>No CGM data for this period</p>
    </div>
  );

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top:6, right:6, bottom:0, left:0 }}>
          <defs>
            <linearGradient id="cgmGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="var(--cyan)" stopOpacity="0.15"/>
              <stop offset="100%" stopColor="var(--cyan)" stopOpacity="0.01"/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="4 8" stroke="rgba(80,110,160,0.07)"/>
          <ReferenceArea y1={lowThreshold} y2={highThreshold} fill="rgba(0,200,122,0.04)" stroke="rgba(0,200,122,0.14)" strokeDasharray="5 5"/>
          <ReferenceLine y={lowThreshold}  stroke="var(--rose)"  strokeDasharray="5 5" strokeWidth={1} strokeOpacity={0.55}/>
          <ReferenceLine y={highThreshold} stroke="var(--amber)" strokeDasharray="5 5" strokeWidth={1} strokeOpacity={0.55}/>
          <XAxis dataKey="t" tick={{ fill:'var(--muted)', fontSize:9, fontFamily:'JetBrains Mono' }} tickLine={false} axisLine={{ stroke:'var(--border)' }} interval="preserveStartEnd"/>
          <YAxis domain={[40,360]} tick={{ fill:'var(--muted)', fontSize:9, fontFamily:'JetBrains Mono' }} tickLine={false} axisLine={false} width={30}/>
          <Tooltip content={<Tip/>}/>
          <Area type="monotone" dataKey="g" fill="url(#cgmGrad)" stroke="none"/>
          <Line type="monotone" dataKey="g" stroke="var(--cyan)" strokeWidth={1.8} dot={false}
            activeDot={{ r:4, fill:'var(--cyan)', strokeWidth:0 }}/>
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
