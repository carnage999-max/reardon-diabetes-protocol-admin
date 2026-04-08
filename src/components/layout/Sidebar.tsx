import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth, useClinic } from '../../hooks/ctx';
import { Activity, Users, Bell, ClipboardList, Building2, Shield, Settings, LogOut, ChevronRight } from 'lucide-react';
import logo from '../../assets/logo.jpeg';

const NAV = [
  { to: '/', icon: Users, label: 'Roster' },
  { to: '/alerts', icon: Bell, label: 'Alerts' },
  { to: '/protocols', icon: ClipboardList, label: 'Protocols' },
  { to: '/clinic', icon: Building2, label: 'Clinic' },
  { to: '/audit', icon: Shield, label: 'Audit Log', adminOnly: true },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { clinic } = useClinic();
  const navigate = useNavigate();

  const doLogout = () => { logout(); navigate('/login'); };
  const visible = NAV.filter(n => !n.adminOnly || user?.role === 'ADMIN');
  const name = user?.profile?.first_name
    ? `${user.profile.first_name} ${user.profile.last_name ?? ''}`.trim()
    : user?.email ?? '';

  return (
    <aside style={{ width: 208, flexShrink: 0, background: 'var(--surface)', borderRight: '1px solid var(--border)', height: '100vh', display: 'flex', flexDirection: 'column', position: 'sticky', top: 0 }}>

      {/* Logo */}
      <div style={{ padding: '16px 14px 12px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 0 14px rgba(0,191,224,0.32)' }}>
            <img src={logo} alt="Reardon Protocol" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 8 }} />
          </div>
          <div>
            <p style={{ fontFamily: 'Syne,sans-serif', fontSize: 13, fontWeight: 700, color: 'var(--text)', lineHeight: 1.2 }}>Reardon Protocol</p>
            <p style={{ fontSize: 9, color: 'var(--muted)', lineHeight: 1.2, letterSpacing: '0.03em' }}>CLINICAL DASHBOARD</p>
          </div>
        </div>
      </div>

      {/* Clinic name */}
      {clinic && (
        <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', background: 'var(--s2)' }}>
          <p style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Clinic</p>
          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{clinic.name}</p>
        </div>
      )}

      {/* No clinic warning */}
      {!clinic && user?.role === 'ADMIN' && (
        <div style={{ margin: '8px 8px 0', padding: '8px 10px', borderRadius: 8, background: 'var(--amber-bg)', border: '1px solid rgba(232,160,0,0.22)', fontSize: 11, color: 'var(--amber)', lineHeight: 1.5 }}>
          No clinic yet.{' '}
          <button onClick={() => navigate('/clinic')} style={{ textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: 'inherit' }}>Create one →</button>
        </div>
      )}

      {/* Role badge */}
      <div style={{ padding: '6px 12px 0' }}>
        <span className={`badge ${user?.role === 'ADMIN' ? 'b-amber' : 'b-cyan'}`} style={{ fontSize: 9 }}>
          {user?.role === 'ADMIN' ? 'Administrator' : 'Clinician'}
        </span>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '10px 6px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
        {visible.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} end={to === '/'}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px',
              borderRadius: 8, fontSize: 13, fontWeight: 500, textDecoration: 'none',
              color: isActive ? 'var(--cyan)' : 'var(--muted)',
              background: isActive ? 'var(--cyan-bg)' : 'transparent',
              transition: 'all 0.12s',
            })}>
            {({ isActive }) => (
              <>
                <Icon size={14} strokeWidth={isActive ? 2.5 : 1.8} style={{ flexShrink: 0 }} />
                <span style={{ flex: 1 }}>{label}</span>
                {isActive && <ChevronRight size={10} style={{ opacity: 0.4 }} />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div style={{ padding: '8px 6px', borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px', borderRadius: 8, background: 'var(--s2)' }}>
          <div style={{ width: 28, height: 28, borderRadius: 14, background: 'linear-gradient(135deg,var(--cyan),var(--green))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#040C14', flexShrink: 0 }}>
            {(user?.profile?.first_name?.[0] ?? user?.email?.[0] ?? 'C').toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</p>
            <p style={{ fontSize: 10, color: 'var(--muted)' }}>{user?.email}</p>
          </div>
          <button onClick={doLogout} title="Sign out" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 3, flexShrink: 0 }}>
            <LogOut size={13} />
          </button>
        </div>
      </div>
    </aside>
  );
}
