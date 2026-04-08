import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Auth } from '../services/api';

interface User {
  id: string; email: string; role: 'CLINICIAN' | 'ADMIN';
  clinic_id?: string;
  profile?: { first_name?: string; last_name?: string; credentials?: string; specialty?: string };
}

interface AuthCtx {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const Ctx = createContext<AuthCtx>({} as AuthCtx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('rp_access_token');
    if (!token) { setLoading(false); return; }
    Auth.me()
      .then(r => setUser(r.data.data))
      .catch(() => { localStorage.clear(); })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const { data } = await Auth.login(email, password);
    localStorage.setItem('rp_access_token',  data.data.access_token);
    localStorage.setItem('rp_refresh_token', data.data.refresh_token);
    const me = await Auth.me();
    const u = me.data.data;
    if (!['CLINICIAN','ADMIN'].includes(u.role)) {
      localStorage.clear();
      throw new Error('Access restricted to clinical staff only.');
    }
    setUser(u);
  };

  const logout = () => {
    Auth.logout().catch(() => {});
    localStorage.clear();
    setUser(null);
  };

  return <Ctx.Provider value={{ user, loading, login, logout }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
