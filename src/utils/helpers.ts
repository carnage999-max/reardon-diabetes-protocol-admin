import { formatDistanceToNow, format, parseISO, isValid } from 'date-fns';

export function ago(iso?: string | null): string {
  if (!iso) return '—';
  try { return formatDistanceToNow(parseISO(iso), { addSuffix: true }); }
  catch { return '—'; }
}

export function fmtDate(iso?: string | null, f = 'dd MMM yyyy'): string {
  if (!iso) return '—';
  try { const d = parseISO(iso); return isValid(d) ? format(d, f) : '—'; }
  catch { return '—'; }
}

export function fmtTime(iso?: string | null): string {
  if (!iso) return '—';
  try { return format(parseISO(iso), 'HH:mm'); }
  catch { return '—'; }
}

export function glucoseColor(v?: number | null): string {
  if (v == null) return 'var(--muted)';
  if (v < 54)   return 'var(--rose)';
  if (v < 70)   return '#E06030';
  if (v <= 180) return 'var(--green)';
  if (v <= 250) return 'var(--amber)';
  return 'var(--rose)';
}

export const TREND_ARROW: Record<string, string> = {
  RAPIDLY_RISING:  '↑↑', RISING:          '↑',
  SLIGHTLY_RISING: '↗',  FLAT:            '→',
  SLIGHTLY_FALLING:'↘',  FALLING:         '↓',
  RAPIDLY_FALLING: '↓↓',
};

export function riskLevel(p: any): 'critical' | 'warning' | 'ok' {
  if (Number(p.open_urgent_alerts) > 0)              return 'critical';
  if (Number(p.safety_events_7d)   > 0)              return 'warning';
  if (!isNaN(Number(p.adherence_pct_7d)) && Number(p.adherence_pct_7d) < 50) return 'warning';
  const g = Number(p.latest_glucose);
  if (!isNaN(g) && (g < 70 || g > 250))             return 'warning';
  return 'ok';
}

export function riskScore(p: any): number {
  let s = 0;
  s += Number(p.open_urgent_alerts) * 100;
  s += Number(p.safety_events_7d)   * 40;
  const adh = Number(p.adherence_pct_7d);
  if (!isNaN(adh) && adh < 50) s += 20;
  const g = Number(p.latest_glucose);
  if (!isNaN(g) && (g < 54 || g > 300)) s += 30;
  else if (!isNaN(g) && (g < 70 || g > 250)) s += 15;
  return s;
}

export function diabetesLabel(t?: string): string {
  return { TYPE_1:'Type 1', TYPE_2:'Type 2', PREDIABETES:'Prediabetes', GESTATIONAL:'Gestational', OTHER:'Other' }[t ?? ''] ?? (t ?? '—');
}

export function stepTypeLabel(t?: string): string {
  return { MEDICATION:'Medication', MEAL_LOG:'Meal Log', GLUCOSE_CHECK:'Glucose Check', ACTIVITY:'Activity', WELLNESS:'Wellness', EDUCATION:'Education', CUSTOM:'Custom' }[t ?? ''] ?? (t ?? '—');
}

export function stepTypeColor(t?: string): string {
  return { MEDICATION:'var(--purple)', MEAL_LOG:'var(--amber)', GLUCOSE_CHECK:'var(--cyan)', ACTIVITY:'var(--green)', WELLNESS:'#E06090', EDUCATION:'#5090E8', CUSTOM:'var(--muted)' }[t ?? ''] ?? 'var(--muted)';
}

export function initials(first?: string, last?: string, email?: string): string {
  if (first && last)  return `${first[0]}${last[0]}`.toUpperCase();
  if (first)          return first.slice(0, 2).toUpperCase();
  return (email ?? 'PA').slice(0, 2).toUpperCase();
}

export function dayLabels(days: number[]): string {
  if (!days?.length) return '—';
  if (days.length === 7) return 'Every day';
  const sorted = [...days].sort();
  if (JSON.stringify(sorted) === '[1,2,3,4,5]') return 'Weekdays';
  if (JSON.stringify(sorted) === '[0,6]')        return 'Weekends';
  return sorted.map(d => ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d]).join(', ');
}

export function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
}

export function snakeKey(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 100);
}
