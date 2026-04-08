import axios from 'axios';

const http = axios.create({ baseURL: 'https://diabetes-api.reardonprotocol.com/v1', timeout: 60_000 });

// Attach token
http.interceptors.request.use(cfg => {
  const t = localStorage.getItem('rp_token');
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

// Auto-refresh on 401
http.interceptors.response.use(r => r, async err => {
  const orig = err.config;
  if (err.response?.status === 401 && !orig._retry) {
    orig._retry = true;
    try {
      const rt = localStorage.getItem('rp_refresh');
      const { data } = await axios.post('https://diabetes-api.reardonprotocol.com/v1/auth/refresh', { refresh_token: rt });
      localStorage.setItem('rp_token', data.data.access_token);
      orig.headers.Authorization = `Bearer ${data.data.access_token}`;
      return http(orig);
    } catch {
      localStorage.clear();
      window.location.href = '/login';
    }
  }
  return Promise.reject(err);
});

export default http;

// ── Helpers ───────────────────────────────────────────────────
/** Appends ?clinic_id=X only when provided */
function cq(clinicId?: string | null) {
  return clinicId ? { params: { clinic_id: clinicId } } : {};
}
export function dlBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a   = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

// ── Auth ─────────────────────────────────────────────────────
export const authApi = {
  register: (body: { email: string; password: string; role: string; first_name: string; last_name: string; invite_code?: string }) =>
    http.post('/auth/register', body),
  login:          (email: string, password: string) => http.post('/auth/login', { email, password }),
  me:             ()                                 => http.get('/auth/me'),
  logout:         ()                                 => http.post('/auth/logout'),
  changePassword: (current: string, next: string)   => http.post('/auth/change-password', { current_password: current, new_password: next }),
};

// ── Clinics ───────────────────────────────────────────────────
export const clinicsApi = {
  list:         ()                              => http.get('/clinics'),
  get:          (id: string)                    => http.get(`/clinics/${id}`),
  create:       (name: string, slug: string)    => http.post('/clinics', { name, slug }),
  update:       (id: string, d: any)            => http.put(`/clinics/${id}`, d),
  staff:        (id: string)                    => http.get(`/clinics/${id}/staff`),
  rotateInvite: (id: string)                    => http.post(`/clinics/${id}/rotate-invite`),
};

// ── Clinician endpoints ───────────────────────────────────────
export const clinicianApi = {
  // GET /v1/clinician/roster  returns: id, email, first_name, last_name, diabetes_type,
  //   onboarding_completed, hypo_alert_urgent, hypo_alert_warning,
  //   latest_glucose, trend_arrow, last_cgm_at,
  //   open_urgent_alerts, adherence_pct_7d, safety_events_7d
  roster:   (clinicId?: string | null) => http.get('/clinician/roster',               cq(clinicId)),
  patient:  (id: string, clinicId?: string | null) => http.get(`/clinician/patients/${id}`,      cq(clinicId)),
  cgm:      (id: string, from: string, to: string, clinicId?: string | null) =>
    http.get(`/clinician/patients/${id}/cgm`, { params: { from, to, ...(clinicId ? { clinic_id: clinicId } : {}) } }),
  timeline: (id: string, date: string, clinicId?: string | null) =>
    http.get(`/clinician/patients/${id}/timeline`, { params: { date, ...(clinicId ? { clinic_id: clinicId } : {}) } }),
  exportPdf:(id: string, window: string, clinicId?: string | null) =>
    http.post(`/clinician/patients/${id}/export`, { window },
      { params: { format: 'pdf', ...(clinicId ? { clinic_id: clinicId } : {}) }, responseType: 'blob', timeout: 120_000 }),
};

// ── Users ─────────────────────────────────────────────────────
export const usersApi = {
  myProfile:     ()         => http.get('/users/profile'),
  updateProfile: (d: any)   => http.put('/users/profile', d),
  // PUT /v1/users/patients/:id/alert-thresholds
  // Body: { hypo_urgent, hypo_warning, hyper_warning, hyper_urgent } (all optional ints)
  setThresholds: (id: string, d: { hypo_urgent?: number; hypo_warning?: number; hyper_warning?: number; hyper_urgent?: number }) =>
    http.put(`/users/patients/${id}/alert-thresholds`, d),
};

// ── Protocols ─────────────────────────────────────────────────
export const protocolApi = {
  // GET /v1/protocol/manage?clinic_id=X
  list:    (clinicId?: string | null) => http.get('/protocol/manage', cq(clinicId)),
  // GET /v1/protocol/manage/:id?clinic_id=X  returns protocol + steps[]
  get:     (id: string, clinicId?: string | null) => http.get(`/protocol/manage/${id}`, cq(clinicId)),
  // POST /v1/protocol/manage  body: { name, description?, version }
  create:  (body: { name: string; description?: string; version: string }, clinicId?: string | null) =>
    http.post('/protocol/manage', body, cq(clinicId)),
  // POST /v1/protocol/manage/:id/steps
  // body: { step_key, title, description?, step_type, schedule_days, schedule_time?, is_required, weight, config, sort_order }
  addStep: (protocolId: string, body: any, clinicId?: string | null) =>
    http.post(`/protocol/manage/${protocolId}/steps`, body, cq(clinicId)),
  // POST /v1/protocol/manage/assign  body: { user_id, protocol_id, start_date? }
  assign:  (body: { user_id: string; protocol_id: string; start_date?: string }) =>
    http.post('/protocol/manage/assign', body),
};

// ── Alerts ────────────────────────────────────────────────────
export const alertsApi = {
  // GET /v1/alerts/clinic/summary?clinic_id=X
  // returns: { critical_24h, urgent_24h, total_unacknowledged, patients_with_open_urgent }
  clinicSummary: (clinicId?: string | null) => http.get('/alerts/clinic/summary', cq(clinicId)),
};

// ── Audit ─────────────────────────────────────────────────────
export const auditApi = {
  // GET /v1/audit/logs?actor_id=&action=&resource_type=&from=&to=&limit=&page=
  logs:  (params?: Record<string, any>) => http.get('/audit/logs',  { params }),
  // GET /v1/audit/stats  returns array of { action, total, unique_actors, last_occurred }
  stats: ()                             => http.get('/audit/stats'),
};
