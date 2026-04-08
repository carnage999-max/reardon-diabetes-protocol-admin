import { useMemo } from 'react';
import {
  ResponsiveContainer, ComposedChart, Line, Area, XAxis, YAxis,
  Tooltip, ReferenceLine, ReferenceArea, CartesianGrid,
} from 'recharts';
import { format, parseISO } from 'date-fns';

interface CGMPoint {
  reading_at: string;
  glucose_mgdl: number;
  trend_arrow?: string;
}

interface EventPin {
  time: string;
  type: 'meal' | 'insulin' | 'medication' | 'alert' | 'activity';
  label: string;
}

const PIN_COLOR: Record<string, string> = {
  meal:       '#FFB800',
  insulin:    '#00D4FF',
  medication: '#A78BFA',
  alert:      '#FF4D6D',
  activity:   '#00E5A0',
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const val = payload[0]?.value;
  const color = val < 70 ? '#FF4D6D' : val > 180 ? '#FFB800' : '#00E5A0';
  return (
    <div className="card-2 px-3 py-2 text-xs" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
      <p style={{ color: 'var(--muted)' }}>{label}</p>
      <p className="font-mono font-bold text-sm mt-0.5" style={{ color }}>
        {val} <span style={{ color: 'var(--muted)' }}>mg/dL</span>
      </p>
    </div>
  );
};

export default function CGMChart({
  readings,
  events = [],
  height = 260,
  lowThreshold = 70,
  highThreshold = 180,
}: {
  readings: CGMPoint[];
  events?: EventPin[];
  height?: number;
  lowThreshold?: number;
  highThreshold?: number;
}) {
  const data = useMemo(() =>
    readings.map(r => ({
      time: format(parseISO(r.reading_at), 'HH:mm'),
      fullTime: r.reading_at,
      glucose: r.glucose_mgdl,
    })),
    [readings]
  );

  const eventLines = useMemo(() =>
    events.map(e => ({
      ...e,
      timeLabel: format(parseISO(e.time), 'HH:mm'),
    })),
    [events]
  );

  if (!data.length) {
    return (
      <div className="flex items-center justify-center rounded-xl" style={{ height, background: 'var(--surface2)', border: '1px solid var(--border)' }}>
        <p className="text-xs" style={{ color: 'var(--muted)' }}>No CGM data for this period</p>
      </div>
    );
  }

  return (
    <div className="relative" style={{ height }}>
      {/* Zone labels */}
      <div className="absolute left-2 top-2 flex flex-col gap-1 z-10 pointer-events-none">
        <span className="text-xs font-semibold" style={{ color: 'rgba(255,77,109,0.7)' }}>HIGH</span>
      </div>
      <div className="absolute left-2 bottom-6 flex flex-col gap-1 z-10 pointer-events-none">
        <span className="text-xs font-semibold" style={{ color: 'rgba(255,77,109,0.7)' }}>LOW</span>
      </div>

      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
          <defs>
            <linearGradient id="glucoseGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#00D4FF" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#00D4FF" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 6" stroke="rgba(255,255,255,0.04)" />

          {/* Target range shading */}
          <ReferenceArea y1={lowThreshold} y2={highThreshold}
            fill="rgba(0,229,160,0.04)" stroke="rgba(0,229,160,0.12)" strokeDasharray="4 4" />

          {/* Threshold lines */}
          <ReferenceLine y={lowThreshold}  stroke="#FF4D6D" strokeDasharray="5 5" strokeWidth={1} strokeOpacity={0.6} />
          <ReferenceLine y={highThreshold} stroke="#FFB800" strokeDasharray="5 5" strokeWidth={1} strokeOpacity={0.6} />

          {/* Event pins as vertical reference lines */}
          {eventLines.map((e, i) => (
            <ReferenceLine
              key={i}
              x={e.timeLabel}
              stroke={PIN_COLOR[e.type] ?? '#7888A8'}
              strokeWidth={1.5}
              strokeDasharray="3 3"
              strokeOpacity={0.7}
              label={{
                value: e.type === 'meal' ? '🍽' : e.type === 'insulin' ? '💉' : e.type === 'alert' ? '⚠' : '●',
                position: 'top',
                fontSize: 10,
              }}
            />
          ))}

          <XAxis
            dataKey="time"
            tick={{ fill: 'var(--muted)', fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: 'var(--border)' }}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[40, 350]}
            tick={{ fill: 'var(--muted)', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={36}
          />

          <Tooltip content={<CustomTooltip />} />

          <Area
            type="monotone"
            dataKey="glucose"
            fill="url(#glucoseGrad)"
            stroke="none"
          />
          <Line
            type="monotone"
            dataKey="glucose"
            stroke="#00D4FF"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: '#00D4FF', strokeWidth: 0 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
