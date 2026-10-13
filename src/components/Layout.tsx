import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import Icon from './Icon';
import PinGate from './PinGate';
import Sidebar from './Sidebar';
import { ADMIN_UNLOCK_KEY } from '../config/admin';

export default function Layout() {
  const [pinOpen, setPinOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function openAdmin() {
    // Stay unlocked for the rest of the session once the PIN is entered.
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
    </div>
  );
}
