import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import MenuPage from './pages/MenuPage';
import CheckoutPage from './pages/CheckoutPage';
import ReceiptPage from './pages/ReceiptPage';
import ReportsPage from './pages/ReportsPage';
import AdminProductsPage from './pages/AdminProductsPage';
import AdminTransactionsPage from './pages/AdminTransactionsPage';
import AdminAuditPage from './pages/AdminAuditPage';
import { MenuProvider } from './context/MenuContext';
import { CartProvider } from './context/CartContext';
import { SalesProvider } from './context/SalesContext';
import { ADMIN_UNLOCK_KEY } from './config/admin';
import type { ReactNode } from 'react';

/** Blocks direct navigation to /admin/* unless the PIN was entered this session. */
function RequireAdmin({ children }: { children: ReactNode }) {
  const unlocked = sessionStorage.getItem(ADMIN_UNLOCK_KEY) === 'true';
  return unlocked ? <>{children}</> : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <MenuProvider>
      <CartProvider>
        <SalesProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<CheckoutPage />} />
              <Route path="menu" element={<MenuPage />} />
              <Route path="receipt/:saleId" element={<ReceiptPage />} />
              <Route path="reports" element={<ReportsPage />} />
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
        </SalesProvider>
      </CartProvider>
    </MenuProvider>
  );
}
