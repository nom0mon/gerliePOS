import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import Icon from './Icon';
import PinGate from './PinGate';
import Sidebar from './Sidebar';
import { ADMIN_UNLOCK_KEY } from '../config/admin';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { signedIn, role } = useAuth();
  const [pinOpen, setPinOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  function openAdmin() {
    // Signed-in users use their real role; local/offline users use the PIN.
    if (signedIn) {
      if (role === 'cashier') {
        setNotice('Admin is available to owners only.');
        return;
      }
      setSidebarOpen(true);
      return;
    }
    // Local mode: stay unlocked for the rest of the session once PIN entered.
    if (sessionStorage.getItem(ADMIN_UNLOCK_KEY) === 'true') {
      setSidebarOpen(true);
    } else {
      setPinOpen(true);
    }
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <button
          type="button"
          className="header-btn"
          aria-label="Open admin menu"
          onClick={openAdmin}
        >
          <Icon name="menu" size={22} />
        </button>
        <span className="brand-mark" aria-hidden>
          <Icon name="coffee" size={18} />
        </span>
        Kaffeed
        <SyncIndicator />
      </header>

      <main className="app-main">
        <Outlet />
      </main>

      <nav className="bottom-nav" aria-label="Primary">
        <NavLink to="/" end>
          <span className="nav-icon" aria-hidden>
            <Icon name="bag" size={22} />
          </span>
          Checkout
        </NavLink>
        <NavLink to="/menu">
          <span className="nav-icon" aria-hidden>
            <Icon name="coffee" size={22} />
          </span>
          Menu
        </NavLink>
        <NavLink to="/reports">
          <span className="nav-icon" aria-hidden>
            <Icon name="chart" size={22} />
          </span>
          Reports
        </NavLink>
      </nav>

      {pinOpen && (
        <PinGate
          onUnlock={() => {
            sessionStorage.setItem(ADMIN_UNLOCK_KEY, 'true');
            setPinOpen(false);
            setSidebarOpen(true);
          }}
          onCancel={() => setPinOpen(false)}
        />
      )}

      {sidebarOpen && <Sidebar onClose={() => setSidebarOpen(false)} />}
      {notice && (
        <div
          role="status"
          className="toast"
          onClick={() => setNotice(null)}
          style={{
            position: 'fixed',
            bottom: 88,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--color-danger-soft)',
            color: 'var(--color-danger)',
            padding: '10px 16px',
            borderRadius: 10,
            zIndex: 50,
          }}
        >
          {notice}
        </div>
      )}
    </div>
  );
}


/**
 * Small cloud-sync indicator in the header. Renders nothing in local-only mode
 * (offline-only / client build), so that experience is visually unchanged.
 */
function SyncIndicator() {
  const { syncState } = useAuth();
  if (syncState === 'local') return null;

  const map: Record<string, { label: string; color: string; bg: string }> = {
    syncing: { label: 'Synced', color: '#166534', bg: '#dcfce7' },
    offline: { label: 'Offline', color: '#92400e', bg: '#fef3c7' },
    error: {
      label: 'Sync error',
      color: 'var(--color-danger)',
      bg: 'var(--color-danger-soft)',
    },
  };
  const s = map[syncState];
  return (
    <span
      role="status"
      aria-label={`Cloud sync: ${s.label}`}
      title={`Cloud sync: ${s.label}`}
      style={{
        marginLeft: 'auto',
        fontSize: '0.72rem',
        fontWeight: 600,
        padding: '2px 8px',
        borderRadius: 999,
        color: s.color,
        background: s.bg,
      }}
    >
      {s.label}
    </span>
  );
}
