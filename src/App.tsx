import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import CatalogPage from './pages/CatalogPage';
import CheckoutPage from './pages/CheckoutPage';
import ReceiptPage from './pages/ReceiptPage';
import ReportsPage from './pages/ReportsPage';
import { CatalogProvider } from './context/CatalogContext';
import { CartProvider } from './context/CartContext';
import { SalesProvider } from './context/SalesContext';

export default function App() {
  return (
    <CatalogProvider>
      <CartProvider>
        <SalesProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<CatalogPage />} />
              <Route path="checkout" element={<CheckoutPage />} />
              <Route path="receipt/:saleId" element={<ReceiptPage />} />
              <Route path="reports" element={<ReportsPage />} />
            </Route>
          </Routes>
        </SalesProvider>
      </CartProvider>
    </CatalogProvider>
  );
}
