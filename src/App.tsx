import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import Layout from './components/Layout';
import MenuPage from './pages/MenuPage';
import CheckoutPage from './pages/CheckoutPage';
import ReceiptPage from './pages/ReceiptPage';
import ReportsPage from './pages/ReportsPage';
import { MenuProvider } from './context/MenuContext';
import { CartProvider } from './context/CartContext';
import { SalesProvider } from './context/SalesContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ADMIN_UNLOCK_KEY } from './config/admin';
import type { ReactNode } from 'react';

// Admin + account screens are owner-only and rarely the first screen a cashier
// opens, so they are code-split out of the initial (checkout) bundle to keep
// the first load light on low-end devices.
const AuthPage = lazy(() => import('./pages/AuthPage'));
const AdminProductsPage = lazy(() => import('./pages/AdminProductsPage'));
const AdminTransactionsPage = lazy(() => import('./pages/AdminTransactionsPage'));
const AdminAuditPage = lazy(() => import('./pages/AdminAuditPage'));

/**
 * Gates /admin/* routes.
 *
 * Role model:
 *   - Signed-in CASHIER → blocked (redirected home). Admin is owner-only.
 *   - Signed-in OWNER   → allowed.
 *   - Local / signed-out operator → allowed through here; the soft PIN gate in
 *     Layout still protects admin on a shared offline device.
 * This keeps the offline-first single-device experience intact while adding
 * real role-based access once a business signs in.
 */
function RequireAdmin({ children }: { children: ReactNode }) {
  const { signedIn, role } = useAuth();

  if (signedIn && role === 'cashier') {
    return <Navigate to="/" replace />;
  }
  // Local/offline mode keeps the PIN-based soft lock.
  if (!signedIn) {
    const unlocked = sessionStorage.getItem(ADMIN_UNLOCK_KEY) === 'true';
    if (!unlocked) return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <MenuProvider>
        <CartProvider>
          <SalesProvider>
            <Suspense fallback={<p className="muted" style={{ padding: 16 }}>Loading…</p>}>
            <Routes>
              <Route element={<Layout />}>
                <Route index element={<CheckoutPage />} />
                <Route path="menu" element={<MenuPage />} />
                <Route path="receipt/:saleId" element={<ReceiptPage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="account" element={<AuthPage />} />
                <Route
                  path="admin/products"
                  element={
                    <RequireAdmin>
                      <AdminProductsPage />
                    </RequireAdmin>
                  }
                />
                <Route
                  path="admin/transactions"
                  element={
                    <RequireAdmin>
                      <AdminTransactionsPage />
                    </RequireAdmin>
                  }
                />
                <Route
                  path="admin/audit"
                  element={
                    <RequireAdmin>
                      <AdminAuditPage />
                    </RequireAdmin>
                  }
                />
              </Route>
            </Routes>
            </Suspense>
          </SalesProvider>
        </CartProvider>
      </MenuProvider>
    </AuthProvider>
  );
}
