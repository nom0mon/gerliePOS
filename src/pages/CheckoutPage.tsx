import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCatalog } from '../context/CatalogContext';
import { useCart, lineTotal } from '../context/CartContext';
import { useSales } from '../context/SalesContext';
import { formatMoney } from '../utils/money';

export default function CheckoutPage() {
  const { products, loading } = useCatalog();
  const { lines, total, count, isEmpty, addItem, setQuantity, removeItem } =
    useCart();
  const { completeSale } = useSales();
  const navigate = useNavigate();
  const [charging, setCharging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inStock = (products ?? []).filter((p) => p.stockQuantity > 0);

  async function handleCharge() {
    setError(null);
    setCharging(true);
    try {
      const saleId = await completeSale();
      navigate(`/receipt/${saleId}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not complete the sale.'
      );
    } finally {
      setCharging(false);
    }
  }

  return (
    <section>
      <h1 className="page-title">Checkout</h1>

      <h2 style={{ fontSize: '1rem' }}>Products</h2>
      {loading && <p className="muted">Loading…</p>}
      {!loading && inStock.length === 0 && (
        <p className="muted">No products in stock.</p>
      )}
      {inStock.map((p) => (
        <button
          key={p.id}
          type="button"
          className="card"
          onClick={() => addItem(p)}
          style={{
            width: '100%',
            textAlign: 'left',
            cursor: 'pointer',
            background: '#fff',
          }}
          aria-label={`Add ${p.name} to cart`}
        >
          <div className="row">
            <strong>{p.name}</strong>
            <span className="spacer" />
            <span>{formatMoney(p.price)}</span>
          </div>
          <div className="muted" style={{ fontSize: '0.8rem' }}>
            Stock: {p.stockQuantity}
          </div>
        </button>
      ))}

      <h2 style={{ fontSize: '1rem', marginTop: 20 }}>
        Cart {count > 0 && <span className="muted">({count})</span>}
      </h2>

      {isEmpty && <p className="muted">Cart is empty. Tap a product to add it.</p>}

      {lines.map((line) => (
        <div className="card" key={line.productId}>
          <div className="row">
            <strong>{line.name}</strong>
            <span className="spacer" />
            <span>{formatMoney(lineTotal(line))}</span>
          </div>
          <div className="row" style={{ marginTop: 10 }}>
            <button
              type="button"
              className="qty-btn"
              aria-label={`Decrease ${line.name}`}
              onClick={() => setQuantity(line.productId, line.quantity - 1)}
            >
              −
            </button>
            <span
              style={{ minWidth: 32, textAlign: 'center', fontWeight: 700 }}
              aria-label={`${line.name} quantity`}
            >
              {line.quantity}
            </span>
            <button
              type="button"
              className="qty-btn"
              aria-label={`Increase ${line.name}`}
              disabled={line.quantity >= line.stockAvailable}
              onClick={() => setQuantity(line.productId, line.quantity + 1)}
            >
              +
            </button>
            <span className="spacer" />
            <button
              type="button"
              className="btn btn-danger"
              style={{ width: 'auto' }}
              aria-label={`Remove ${line.name}`}
              onClick={() => removeItem(line.productId)}
            >
              Remove
            </button>
          </div>
        </div>
      ))}

      {!isEmpty && (
        <div className="card">
          <div className="row">
            <strong>Total</strong>
            <span className="spacer" />
            <strong aria-label="Cart total">{formatMoney(total)}</strong>
          </div>
        </div>
      )}

      {error && (
        <p style={{ color: 'var(--color-danger)' }} role="alert">
          {error}
        </p>
      )}

      {!isEmpty && (
        <button
          type="button"
          className="btn"
          onClick={handleCharge}
          disabled={charging}
        >
          {charging ? 'Processing…' : `Charge ${formatMoney(total)} (Cash)`}
        </button>
      )}
    </section>
  );
}
