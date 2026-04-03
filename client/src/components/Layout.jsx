import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Home, Clock, Users, Trophy, Shield } from 'lucide-react';
import { useMatchStore } from '../store';
import OfflineBanner from './OfflineBanner';

const NAV = [
  { to: '/',        label: 'Home',     Icon: Home },
  { to: '/history', label: 'History',  Icon: Clock },
  { to: '/players', label: 'Players',  Icon: Users },
  { to: '/teams',   label: 'Teams',    Icon: Shield },
];

export default function Layout() {
  const { setOnline, initPendingCount } = useMatchStore();

  useEffect(() => {
    initPendingCount();
    const on  = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online',  on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  return (
    <div className="app-shell">
      {/* Desktop sidebar */}
      <aside className="sidebar" style={{ display: 'none' }} id="sidebar">
        <div className="logo" style={{ marginBottom: '2rem', fontSize: '1.5rem' }}>🏏 CrickArena</div>
        {NAV.map(({ to, label, Icon }) => (
          <NavLink key={to} to={to} end={to === '/'}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: '.7rem',
              padding: '.7rem 1rem', borderRadius: '10px', marginBottom: '.25rem',
              color: isActive ? 'var(--clr-primary)' : 'var(--clr-muted)',
              background: isActive ? 'rgba(249,115,22,.1)' : 'transparent',
              fontWeight: 600, fontSize: '.9rem', transition: 'all .15s',
            })}>
            <Icon size={18} /> {label}
          </NavLink>
        ))}
      </aside>

      <div className="main-content" style={{ flex: 1 }}>
        <OfflineBanner />

        {/* Top header */}
        <header className="top-header">
          <span className="logo">🏏 CrickArena</span>
          <NavLink to="/match/new">
            <button className="btn btn-primary btn-sm">+ New Match</button>
          </NavLink>
        </header>

        <main>
          <Outlet />
        </main>

        {/* Mobile bottom nav */}
        <nav className="navbar">
          {NAV.map(({ to, label, Icon }) => (
            <NavLink key={to} to={to} end={to === '/'}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Icon size={22} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
