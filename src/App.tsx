import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, ClinicProvider, useAuth, useClinic } from './hooks/ctx';
import Sidebar from './components/layout/Sidebar';
import { PageLoad } from './components/common/UI';
import { LoginPage, SetupPage } from './pages/Auth';
import RosterPage from './pages/RosterPage';
import PatientDetailPage from './pages/PatientDetailPage';
import ProtocolsPage from './pages/ProtocolsPage';
import AlertsPage from './pages/AlertsPage';
import ClinicPage from './pages/ClinicPage';
import AuditPage from './pages/AuditPage';
import SettingsPage from './pages/SettingsPage';
import PatientMealsPage from './pages/PatientMealsPage';
// ── Authenticated layout shell ────────────────────────────────
function Shell() {
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar />
      <main style={{ flex: 1, overflowY: 'auto', minWidth: 0 }}>
        <Outlet />
      </main>
    </div>
  );
}

// ── Auth guard ────────────────────────────────────────────────
function Guard({ adminOnly }: { adminOnly?: boolean }) {
  const { user, loading } = useAuth();
  const { loading: clinicLoading } = useClinic();
  if (loading || clinicLoading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}><PageLoad /></div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== 'ADMIN') return <Navigate to="/" replace />;
  return <Outlet />;
}

// ── Routes ────────────────────────────────────────────────────
function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}><PageLoad /></div>
  );
  return (
    <Routes>
      {/* Public */}
      <Route path="/setup" element={<SetupPage />} />
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />

      {/* Protected */}
      <Route element={<Guard />}>
        <Route element={<Shell />}>
          <Route index element={<RosterPage />} />
          <Route path="patients/:id" element={<PatientDetailPage />} />
          <Route path="alerts" element={<AlertsPage />} />
          <Route path="protocols" element={<ProtocolsPage />} />
          <Route path="clinic" element={<ClinicPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="patients/:id/meals" element={<PatientMealsPage />} />
          {/* Admin only */}
          <Route element={<Guard adminOnly />}>
            <Route path="audit" element={<AuditPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

// ── Inner app (needs auth before clinic) ─────────────────────
function Inner() {
  return <ClinicProvider><AppRoutes /></ClinicProvider>;
}

// ── Root ──────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Inner />
      </AuthProvider>
    </BrowserRouter>
  );
}
