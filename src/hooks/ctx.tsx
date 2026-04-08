import {
  createContext, useContext, useState, useEffect,
  useCallback, ReactNode,
} from 'react';
import { authApi, clinicsApi } from '../services/api';

export interface User {
  id:        string;
  email:     string;
  role:      'CLINICIAN' | 'ADMIN';
  clinic_id: string | null;
  clinic_name?: string;
  profile?: {
    first_name?: string; last_name?: string;
    credentials?: string; specialty?: string;
  };
}

export interface Clinic {
  id: string; name: string; slug: string;
  invite_code: string | null; is_active: boolean; created_at: string;
}

// ── Auth ─────────────────────────────────────────────────────
interface AuthCtx {
  user: User | null; loading: boolean;
  login: (email: string, pw: string) => Promise<void>;
  logout: () => void;
  reload: () => Promise<void>;
}

const AuthCtx = createContext<AuthCtx>({} as AuthCtx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,    setUser]    = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    const r = await authApi.me();
    const u = r.data.data;
    if (!['CLINICIAN', 'ADMIN'].includes(u.role)) {
      throw new Error('Access restricted to clinical staff only.');
    }
    setUser(u);
    return u;
  }, []);

  useEffect(() => {
    if (!localStorage.getItem('rp_token')) { setLoading(false); return; }
    fetchMe().catch(() => setUser(null)).finally(() => setLoading(false));
  }, [fetchMe]);

  const login = async (email: string, pw: string) => {
    const { data } = await authApi.login(email, pw);
    localStorage.setItem('rp_token',   data.data.access_token);
    localStorage.setItem('rp_refresh', data.data.refresh_token);
    await fetchMe();
  };

  const logout = () => {
    authApi.logout().catch(() => {});
    localStorage.clear();
    setUser(null);
  };

  const reload = async () => { await fetchMe(); };

  return <AuthCtx.Provider value={{ user, loading, login, logout, reload }}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);

// ── Clinic ────────────────────────────────────────────────────
/**
 * Every user (admin or clinician) belongs to exactly one clinic.
 * clinic_id comes from JWT. No clinic switching. No cross-clinic access.
 * clinics[] always contains at most one clinic — the user's own.
 */
interface ClinicCtx {
  clinicId:  string | null;
  clinic:    Clinic | null;
  loading:   boolean;
  refreshClinic: () => Promise<void>;
}

const ClinicCtx = createContext<ClinicCtx>({} as ClinicCtx);

export function ClinicProvider({ children }: { children: ReactNode }) {
  const { user }  = useAuth();
  const [clinic,  setClinic]  = useState<Clinic | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchClinic = useCallback(async (clinicId: string) => {
    try {
      const r = await clinicsApi.get(clinicId);
      setClinic(r.data.data);
    } catch {
      setClinic(null);
    }
  }, []);

  useEffect(() => {
    if (!user) { setLoading(false); return; }

    if (user.clinic_id) {
      fetchClinic(user.clinic_id).finally(() => setLoading(false));
    } else {
      // Admin hasn't created a clinic yet (mid-setup)
      setClinic(null);
      setLoading(false);
    }
  }, [user, fetchClinic]);

  const refreshClinic = async () => {
    if (user?.clinic_id) await fetchClinic(user.clinic_id);
  };

  return (
    <ClinicCtx.Provider value={{ clinicId: user?.clinic_id ?? null, clinic, loading, refreshClinic }}>
      {children}
    </ClinicCtx.Provider>
  );
}

export const useClinic = () => useContext(ClinicCtx);
