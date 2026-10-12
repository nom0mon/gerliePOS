import { useState, type FormEvent } from 'react';
import { useCatalog } from '../context/CatalogContext';
import { formatMoney } from '../utils/money';

export default function CatalogPage() {
  const { products, loading, addProduct } = useCatalog();
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const priceNum = Number(price);
    const stockNum = Number(stock);

    if (!name.trim()) {
      setError('Name is required.');
      return;
    }
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      setError('Price must be a non-negative number.');
      return;
    }
    if (!Number.isInteger(stockNum) || stockNum < 0) {
      setError('Stock must be a non-negative whole number.');
      return;
    }

    await addProduct({
      name: name.trim(),
      price: priceNum,
      stockQuantity: stockNum,
    });

    setName('');
    setPrice('');
    setStock('');
    setShowForm(false);
  }

  return (
    <section>
      <div className="row">
        <h1 className="page-title">Catalog</h1>
        <span className="spacer" />
        <button
          type="button"
          className="btn-secondary btn"
          style={{ width: 'auto' }}
          onClick={() => setShowForm((s) => !s)}
        >
          {showForm ? 'Close' : '+ Add'}
        </button>
      </div>

      {showForm && (
        <form className="card" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="p-name">Name</label>
            <input
              id="p-name"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Bottled Water"
            />
          </div>
          <div className="field">
            <label htmlFor="p-price">Price</label>
            <input
              id="p-price"
              className="input"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div className="field">
            <label htmlFor="p-stock">Stock quantity</label>
            <input
              id="p-stock"
              className="input"
              type="number"
              inputMode="numeric"
              step="1"
              min="0"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              placeholder="0"
            />
          </div>
          {error && (
            <p style={{ color: 'var(--color-danger)', margin: '0 0 12px' }}>
              {error}
            </p>
          )}
          <button type="submit" className="btn">
            Save product
          </button>
        </form>
      )}

      {loading && <p className="muted">Loading…</p>}

      {!loading && products && products.length === 0 && (
        <p className="muted">No products yet. Tap “+ Add” to create one.</p>
      )}

      {!loading &&
        products?.map((p) => (
          <div className="card" key={p.id}>
            <div className="row">
              <strong>{p.name}</strong>
              <span className="spacer" />
              <span>{formatMoney(p.price)}</span>
            </div>
            <div className="row muted" style={{ fontSize: '0.85rem' }}>
              <span>Stock: {p.stockQuantity}</span>
              <span className="spacer" />
              <span>Sold: {p.salesCount}</span>
            </div>
          </div>
        ))}
    </section>
  );
}
