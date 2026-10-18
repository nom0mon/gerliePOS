import { useMemo, useState } from 'react';
import { useMenu } from '../context/MenuContext';
import { formatMoney } from '../utils/money';
import type { MenuItem } from '../types';
import { stockStatus } from '../repositories/stockRepo';
import Icon from '../components/Icon';

/**
 * Menu (quick service view): review the menu grouped by category and flip an
 * item's availability (sold out / back in) during service. This is the fast,
 * always-available cashier screen — it deliberately does NOT add, edit or
 * delete products. Full product CRUD lives in the PIN-gated admin sidebar
 * (Admin · Products) so destructive actions stay behind a lock + confirmation.
 */
export default function MenuPage() {
  const { items, categories, loading, setAvailable } = useMenu();
  const [query, setQuery] = useState('');

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const map = new Map<string, MenuItem[]>();
    for (const i of items ?? []) {
      if (q && !i.name.toLowerCase().includes(q)) continue;
      const arr = map.get(i.category) ?? [];
      arr.push(i);
      map.set(i.category, arr);
    }
    return map;
  }, [items, query]);

  const visibleCategories = categories.filter((c) => grouped.has(c));

  return (
    <section>
      <h1 className="page-title">Menu</h1>

      <div className="field">
        <label htmlFor="menu-search">Search</label>
        <input
          id="menu-search"
          className="input"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Find an item…"
        />
      </div>

      {loading && <p className="muted">Loading…</p>}

      {!loading && items && items.length === 0 && (
        <p className="muted">No menu items yet. Add products in Admin.</p>
      )}

      {!loading && items && items.length > 0 && visibleCategories.length === 0 && (
        <p className="muted">No items match “{query}”.</p>
      )}

      {!loading &&
        visibleCategories.map((cat) => (
          <div key={cat}>
            <div className="section-label">{cat}</div>
            {grouped.get(cat)?.map((item) => (
              <div className="card" key={item.id}>
                <div className="row">
                  <strong
                    className="item-name"
                    style={{ opacity: item.available ? 1 : 0.5 }}
                  >
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
                  {item.available && stockStatus(item) === 'out' && (
                    <span
                      className="badge"
                      style={{
                        background: 'var(--color-danger-soft)',
                        color: 'var(--color-danger)',
                      }}
                    >
                      Out of stock
                    </span>
                  )}
                  {item.available && stockStatus(item) === 'low' && (
                    <span
                      className="badge"
                      style={{
                        background: 'var(--color-warning-soft, #fff4e5)',
                        color: 'var(--color-warning, #b26a00)',
                      }}
                    >
                      Low: {item.stockQty} left
                    </span>
                  )}
                  {item.available && stockStatus(item) === 'ok' && (
                    <span className="badge" style={{ opacity: 0.7 }}>
                      {item.stockQty} in stock
                    </span>
                  )}
                  <span className="spacer" />
                  <span className="price">{formatMoney(item.basePrice)}</span>
                </div>
                <div className="row" style={{ marginTop: 12 }}>
                  <button
                    type="button"
                    className={`btn ${item.available ? 'btn-secondary' : ''}`}
                    aria-label={
                      item.available
                        ? `Mark ${item.name} sold out`
                        : `Mark ${item.name} available`
                    }
                    onClick={() =>
                      item.id != null && setAvailable(item.id, !item.available)
                    }
                  >
                    <Icon name={item.available ? 'ban' : 'check'} size={18} />
                    {item.available ? 'Mark sold out' : 'Mark available'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ))}
    </section>
  );
}
