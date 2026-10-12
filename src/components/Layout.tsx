import { NavLink, Outlet } from 'react-router-dom';

export default function Layout() {
  return (
    <div className="app-shell">
      <header className="app-header">Mommy POS</header>
      <main className="app-main">
        <Outlet />
      </main>
      <nav className="bottom-nav" aria-label="Primary">
        <NavLink to="/" end>
          <span className="nav-icon" aria-hidden>🏷️</span>
          Catalog
        </NavLink>
        <NavLink to="/checkout">
          <span className="nav-icon" aria-hidden>🛒</span>
          Checkout
        </NavLink>
        <NavLink to="/reports">
          <span className="nav-icon" aria-hidden>📊</span>
          Reports
        </NavLink>
      </nav>
    </div>
  );
}
