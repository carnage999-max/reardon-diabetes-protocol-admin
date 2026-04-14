import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import api, { clinicsApi as Clinics } from '../services/api';
import { useAuth } from './useAuth';

interface ClinicCtx {
  clinicId:   string | null;
  clinics:    any[];
  loading:    boolean;
  setActive:  (id: string) => void;
}

const Ctx = createContext<ClinicCtx>({ clinicId: null, clinics: [], loading: true, setActive: () => {} });

export function ClinicProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [clinics,   setClinics]  = useState<any[]>([]);
  const [clinicId,  setClinicId] = useState<string | null>(null);
  const [loading,   setLoading]  = useState(true);

  const setActive = useCallback((id: string) => {
    setClinicId(id);
    localStorage.setItem('rp_clinic_id', id);
    // Patch api default params so every request includes clinic_id automatically
    api.defaults.params = { ...(api.defaults.params ?? {}), clinic_id: id };
  }, []);

  useEffect(() => {
    if (!user) { setLoading(false); return; }

    // If user already has a clinic_id on their token, use it directly
    if (user.clinic_id) {
      setClinicId(user.clinic_id);
      // No need to append as query param — it comes from the JWT
      setLoading(false);
      return;
    }

    // Admin without a clinic_id: fetch clinics and auto-select the first one
    const saved = localStorage.getItem('rp_clinic_id');

    if (user.role === 'ADMIN') {
      Clinics.list()
        .then(r => {
          const list = r.data.data ?? [];
          setClinics(list);
          if (list.length > 0) {
            const id = saved && list.find((c: any) => c.id === saved) ? saved : list[0].id;
            setActive(id);
          }
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [user, setActive]);

  return <Ctx.Provider value={{ clinicId, clinics, loading, setActive }}>{children}</Ctx.Provider>;
}

export const useClinic = () => useContext(Ctx);
