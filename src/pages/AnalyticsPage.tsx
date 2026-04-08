import { useState, useEffect } from 'react';
import { Clinician } from '../services/api';
import { PageLoader, Empty } from '../components/common/UI';
import { BarChart2, Users, TrendingUp, Activity } from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  Tooltip, CartesianGrid, Cell,
} from 'recharts';
import { diabetesLabel } from '../utils/helpers';

export default function AnalyticsPage() {
  const [patients, setPatients] = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    Clinician.roster()
      .then(r => setPatients(r.data.data ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader />;
  if (!patients.length) return (
    <div className="p-6"><Empty icon={<BarChart2 size={32} />} title="No patient data" /></div>
  );

  // Compute clinic-wide aggregates
  const withCGM   = patients.filter(p => p.latest_glucose != null);
  const avgGlucose = withCGM.length ? Math.round(withCGM.reduce((s, p) => s + Number(p.latest_glucose), 0) / withCGM.length) : null;
  const withAdh    = patients.filter(p => !isNaN(Number(p.adherence_pct_7d)));
  const avgAdh     = withAdh.length ? Math.round(withAdh.reduce((s, p) => s + Number(p.adherence_pct_7d), 0) / withAdh.length) : null;
  const totalAlerts = patients.reduce((s, p) => s + Number(p.open_urgent_alerts || 0), 0);
  const lowAdh      = patients.filter(p => Number(p.adherence_pct_7d) < 50).length;

  // Adherence distribution for chart
  const adhBuckets = [
    { label: '0–25%',   count: patients.filter(p => Number(p.adherence_pct_7d) < 25).length },
    { label: '25–50%',  count: patients.filter(p => Number(p.adherence_pct_7d) >= 25 && Number(p.adherence_pct_7d) < 50).length },
    { label: '50–75%',  count: patients.filter(p => Number(p.adherence_pct_7d) >= 50 && Number(p.adherence_pct_7d) < 75).length },
    { label: '75–100%', count: patients.filter(p => Number(p.adherence_pct_7d) >= 75).length },
  ];

  // Glucose distribution
  const glucBuckets = [
    { label: '<70',      count: patients.filter(p => Number(p.latest_glucose) < 70).length,   color: '#FF4D6D' },
    { label: '70–140',   count: patients.filter(p => Number(p.latest_glucose) >= 70 && Number(p.latest_glucose) < 140).length, color: '#00E5A0' },
    { label: '140–180',  count: patients.filter(p => Number(p.latest_glucose) >= 140 && Number(p.latest_glucose) < 180).length, color: '#00D4FF' },
    { label: '180–250',  count: patients.filter(p => Number(p.latest_glucose) >= 180 && Number(p.latest_glucose) < 250).length, color: '#FFB800' },
    { label: '>250',     count: patients.filter(p => Number(p.latest_glucose) >= 250).length,  color: '#FF4D6D' },
  ];

  // Diabetes type breakdown
  const typeCounts: Record<string, number> = {};
  patients.forEach(p => { if (p.diabetes_type) typeCounts[p.diabetes_type] = (typeCounts[p.diabetes_type] ?? 0) + 1; });
  const typeData = Object.entries(typeCounts).map(([t, c]) => ({ label: diabetesLabel(t), count: c }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="card-2 px-3 py-2 text-xs" style={{ border: '1px solid var(--border2)' }}>
        <p style={{ color: 'var(--muted)' }}>{label}</p>
        <p className="font-bold mt-0.5" style={{ color: 'var(--cyan)' }}>{payload[0].value} patients</p>
      </div>
    );
  };

  return (
    <div className="p-6 page-fade">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold" style={{ color: 'var(--text)' }}>Analytics</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>Clinic-wide performance · {patients.length} patients</p>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total Patients',   value: patients.length,  color: 'var(--cyan)',    icon: <Users size={15} /> },
          { label: 'Avg Glucose',      value: avgGlucose ? `${avgGlucose} mg/dL` : '—', color: 'var(--emerald)', icon: <Activity size={15} /> },
          { label: 'Avg Adherence 7d', value: avgAdh != null ? `${avgAdh}%` : '—',     color: 'var(--cyan)',    icon: <TrendingUp size={15} /> },
          { label: 'Open Alerts',      value: totalAlerts,      color: totalAlerts > 0 ? 'var(--rose)' : 'var(--emerald)', icon: <BarChart2 size={15} /> },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <div className="flex items-center gap-2 mb-2" style={{ color: s.color }}>
              {s.icon}
              <span className="text-xs uppercase tracking-wider font-semibold" style={{ color: 'var(--muted)' }}>{s.label}</span>
            </div>
            <p className="font-display text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Adherence distribution */}
        <div className="card p-5">
          <h2 className="font-semibold text-sm mb-4 flex items-center gap-2" style={{ color: 'var(--text)' }}>
            <TrendingUp size={14} style={{ color: 'var(--cyan)' }} /> Protocol Adherence Distribution
          </h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={adhBuckets} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 6" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="label" tick={{ fill: 'var(--muted)', fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={48}>
                {adhBuckets.map((b, i) => (
                  <Cell key={i} fill={i < 2 ? '#FF4D6D' : i === 2 ? '#FFB800' : '#00E5A0'} fillOpacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          {lowAdh > 0 && (
            <p className="text-xs mt-2" style={{ color: 'var(--amber)' }}>
              ⚠ {lowAdh} patient{lowAdh > 1 ? 's' : ''} with adherence below 50%
            </p>
          )}
        </div>

        {/* Glucose distribution */}
        <div className="card p-5">
          <h2 className="font-semibold text-sm mb-4 flex items-center gap-2" style={{ color: 'var(--text)' }}>
            <Activity size={14} style={{ color: 'var(--emerald)' }} /> Latest Glucose Distribution
          </h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={glucBuckets} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 6" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="label" tick={{ fill: 'var(--muted)', fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={48}>
                {glucBuckets.map((b, i) => (
                  <Cell key={i} fill={b.color} fillOpacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Diabetes type breakdown */}
      <div className="card p-5">
        <h2 className="font-semibold text-sm mb-4" style={{ color: 'var(--text)' }}>Patient Cohort by Diabetes Type</h2>
        <div className="flex flex-wrap gap-4">
          {typeData.map(t => (
            <div key={t.label} className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
              <div className="text-2xl font-bold font-display" style={{ color: 'var(--cyan)' }}>{t.count}</div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{t.label}</p>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>{Math.round((t.count / patients.length) * 100)}% of cohort</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
