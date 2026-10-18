import { useMemo, useState, type FormEvent } from 'react';
import { useMenu } from '../context/MenuContext';
import { formatMoney } from '../utils/money';
import type { MenuItem } from '../types';
import Icon from '../components/Icon';
import Sheet from '../components/Sheet';

/**
 * Admin · Products — full CRUD. Lives behind the PIN-gated sidebar (owner /
 * back-office), separate from the fast cashier bottom-nav Menu tab which only
 * toggles sold-out during service.
 */
export default function AdminProductsPage() {
  const { items, categories, loading, addItem, updateItem, removeItem, resetToDefault, configureStock } =
    useMenu();

  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [deleting, setDeleting] = useState<MenuItem | null>(null);
  const [stocking, setStocking] = useState<MenuItem | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const grouped = useMemo(() => {
    const map = new Map<string, MenuItem[]>();
    for (const i of items ?? []) {
      const arr = map.get(i.category) ?? [];
      arr.push(i);
      map.set(i.category, arr);
    }
    return map;
  }, [items]);

  return (
    <section>
      <div className="row">
        <h1 className="page-title" style={{ margin: 0 }}>
          Products
        </h1>
        <span className="spacer" />
        <button
          type="button"
          className="btn-secondary btn"
          style={{ width: 'auto' }}
          onClick={() => setConfirmReset(true)}
        >
          Reset
        </button>
        <button
          type="button"
          className="btn-secondary btn"
          style={{ width: 'auto' }}
          onClick={() => setShowAdd(true)}
        >
          <Icon name="plus" size={18} />
          Add
        </button>
      </div>

      {loading && <p className="muted">Loading…</p>}

      {!loading && items && items.length === 0 && (
        <p className="muted">No products yet. Tap “Add” to create one.</p>
      )}

      {!loading &&
        categories.map((cat) => (
          <div key={cat}>
            <div className="section-label">{cat}</div>
            {grouped.get(cat)?.map((item) => (
              <div className="card" key={item.id}>
                <div className="row">
                  <strong style={{ opacity: item.available ? 1 : 0.5 }}>
                    {item.name}
                  </strong>
                  {!item.available && (
                    <span
                      className="badge"
                      style={{
                        background: 'var(--color-danger-soft)',
                        color: 'var(--color-danger)',
                      }}
                    >
                      Sold out
                    </span>
                  )}
                  <span className="spacer" />
                  <span className="price">{formatMoney(item.basePrice)}</span>
                </div>
                {item.modifierGroups.length > 0 && (
                  <div
                    className="muted"
                    style={{ fontSize: '0.82rem', marginTop: 4 }}
                  >
                    {item.modifierGroups.map((g) => g.name).join(' · ')}
                  </div>
                )}
                <div
                  className="muted"
                  style={{ fontSize: '0.82rem', marginTop: 4 }}
                >
                  {item.trackStock
                    ? `Stock: ${item.stockQty ?? 0}` +
                      (item.lowStockThreshold
                        ? ` (low at ${item.lowStockThreshold})`
                        : '')
                    : 'Stock: not tracked'}
                </div>
                <div className="row" style={{ marginTop: 12 }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ width: 'auto' }}
                    aria-label={`Edit ${item.name}`}
                    onClick={() => setEditing(item)}
                  >
                    <Icon name="edit" size={18} />
                    Edit
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ width: 'auto' }}
                    aria-label={`Manage stock for ${item.name}`}
                    onClick={() => setStocking(item)}
                  >
                    <Icon name="box" size={18} />
                    Stock
                  </button>
                  <span className="spacer" />
                  <button
                    type="button"
                    className="qty-btn"
                    aria-label={`Delete ${item.name}`}
                    onClick={() => setDeleting(item)}
                  >
                    <Icon name="trash" size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ))}

      {showAdd && (
        <ProductForm
          title="Add product"
          categories={categories}
          onCancel={() => setShowAdd(false)}
          onSave={async (data) => {
            await addItem(data);
            setShowAdd(false);
          }}
        />
      )}

      {editing && (
        <ProductForm
          title="Edit product"
          categories={categories}
          initial={editing}
          onCancel={() => setEditing(null)}
          onSave={async (data) => {
            if (editing.id != null) await updateItem(editing.id, data);
            setEditing(null);
          }}
        />
      )}

      {stocking && (
        <StockForm
          item={stocking}
          onCancel={() => setStocking(null)}
          onSave={async ({ trackStock, stockQty, lowStockThreshold }) => {
            if (stocking.id != null) {
              await configureStock(stocking.id, {
                trackStock,
                stockQty,
                lowStockThreshold,
              });
            }
            setStocking(null);
          }}
        />
      )}

      {deleting && (
        <Sheet title="Delete this product?" onClose={() => setDeleting(null)}>          <p className="muted" style={{ marginTop: 0 }}>
            “{deleting.name}” will be permanently removed from the menu. Past
            sales that included it are unaffected.
          </p>
          <button
            type="button"
            className="btn btn-danger"
            onClick={async () => {
              if (deleting.id != null) await removeItem(deleting.id);
              setDeleting(null);
            }}
          >
            <Icon name="trash" size={20} />
            Delete product
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ marginTop: 10 }}
            onClick={() => setDeleting(null)}
          >
            Keep product
          </button>
        </Sheet>
      )}

      {confirmReset && (
        <Sheet
          title="Reset menu to default?"
          onClose={() => setConfirmReset(false)}
        >
          <p className="muted" style={{ marginTop: 0 }}>
            This replaces the entire menu with the built-in default list and
            discards any products you've added or edited. Past sales are
            unaffected. Use this to load the standard menu onto a device.
          </p>
          <button
            type="button"
            className="btn btn-danger"
            onClick={async () => {
              await resetToDefault();
              setConfirmReset(false);
            }}
          >
            <Icon name="box" size={20} />
            Reset to default menu
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ marginTop: 10 }}
            onClick={() => setConfirmReset(false)}
          >
            Cancel
          </button>
        </Sheet>
      )}
    </section>
  );
}

interface ProductFormData {
  name: string;
  category: string;
  basePrice: number;
}

/** Add/Edit form in a bottom sheet. Preserves modifierGroups on edit. */
function ProductForm({
  title,
  initial,
  categories,
  onCancel,
  onSave,
}: {
  title: string;
  initial?: MenuItem;
  categories: string[];
  onCancel: () => void;
  onSave: (data: ProductFormData) => void | Promise<void>;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [category, setCategory] = useState(initial?.category ?? '');
  const [price, setPrice] = useState(
    initial ? String(initial.basePrice) : ''
  );
  const [error, setError] = useState<string | null>(null);

  function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const priceNum = Number(price);
    if (!name.trim()) return setError('Name is required.');
    if (!category.trim()) return setError('Category is required.');
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      return setError('Base price must be a non-negative number.');
    }
    void onSave({
      name: name.trim(),
      category: category.trim(),
      basePrice: priceNum,
    });
  }

  return (
    <Sheet title={title} onClose={onCancel}>
      <form onSubmit={submit}>
        <div className="field">
          <label htmlFor="pf-name">Name</label>
          <input
            id="pf-name"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Iced Coffee"
            autoFocus
          />
        </div>
        <div className="field">
          <label htmlFor="pf-category">Category</label>
          <input
            id="pf-category"
            className="input"
            list="pf-category-options"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="e.g. Drinks"
          />
          <datalist id="pf-category-options">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
        <div className="field">
          <label htmlFor="pf-price">Base price (₱)</label>
          <input
            id="pf-price"
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
        {error && (
          <p style={{ color: 'var(--color-danger)', margin: '0 0 12px' }}>
            {error}
          </p>
        )}
        <button type="submit" className="btn">
          <Icon name="check" size={20} />
          Save
        </button>
      </form>
    </Sheet>
  );
}


interface StockFormData {
  trackStock: boolean;
  stockQty?: number;
  lowStockThreshold?: number;
}

/**
 * Stock management sheet for one product. Lets the owner turn stock tracking
 * on/off and set the current quantity + a low-stock warning threshold. When
 * tracking is off, street-food "cook on demand" behaviour is unchanged.
 */
function StockForm({
  item,
  onCancel,
  onSave,
}: {
  item: MenuItem;
  onCancel: () => void;
  onSave: (data: StockFormData) => void | Promise<void>;
}) {
  const [trackStock, setTrackStock] = useState<boolean>(item.trackStock ?? false);
  const [qty, setQty] = useState<string>(
    item.stockQty != null ? String(item.stockQty) : '0'
  );
  const [threshold, setThreshold] = useState<string>(
    item.lowStockThreshold != null ? String(item.lowStockThreshold) : '0'
  );
  const [error, setError] = useState<string | null>(null);

  function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!trackStock) {
      void onSave({ trackStock: false });
      return;
    }
    const qtyNum = Number(qty);
    const thrNum = Number(threshold);
    if (!Number.isFinite(qtyNum) || qtyNum < 0) {
      return setError('Quantity must be a non-negative number.');
    }
    if (!Number.isFinite(thrNum) || thrNum < 0) {
      return setError('Low-stock threshold must be a non-negative number.');
    }
    void onSave({
      trackStock: true,
      stockQty: Math.floor(qtyNum),
      lowStockThreshold: Math.floor(thrNum),
    });
  }

  return (
    <Sheet title={`Stock · ${item.name}`} onClose={onCancel}>
      <form onSubmit={submit}>
        <label
          className="row"
          style={{ gap: 10, cursor: 'pointer', marginBottom: 12 }}
        >
          <input
            type="checkbox"
            checked={trackStock}
            onChange={(e) => setTrackStock(e.target.checked)}
            aria-label="Track stock for this item"
          />
          <span>Track stock for this item</span>
        </label>

        {trackStock && (
          <>
            <div className="field">
              <label htmlFor="sf-qty">Current quantity</label>
              <input
                id="sf-qty"
                className="input"
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                autoFocus
              />
            </div>
            <div className="field">
              <label htmlFor="sf-threshold">Low-stock warning at</label>
              <input
                id="sf-threshold"
                className="input"
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
              />
            </div>
          </>
        )}

        {error && (
          <p style={{ color: 'var(--color-danger)', margin: '0 0 12px' }}>
            {error}
          </p>
        )}
        <button type="submit" className="btn">
          <Icon name="check" size={20} />
          Save stock
        </button>
      </form>
    </Sheet>
  );
}
