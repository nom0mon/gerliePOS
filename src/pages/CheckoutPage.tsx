import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMenu } from '../context/MenuContext';
import {
  useCart,
  lineTotal,
  computeUnitPrice,
} from '../context/CartContext';
import { useSales } from '../context/SalesContext';
import { formatMoney } from '../utils/money';
import { PaymentType, type MenuItem, type SelectedModifier } from '../types';
import Icon from '../components/Icon';
import Sheet from '../components/Sheet';

export default function CheckoutPage() {
  const { items, categories, loading } = useMenu();
  const { lines, total, count, isEmpty, addItem, setQuantity, removeItem, clear } =
    useCart();
  const { completeSale } = useSales();
  const navigate = useNavigate();

  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [picking, setPicking] = useState<MenuItem | null>(null);
  const [payment, setPayment] = useState<PaymentType>(PaymentType.CASH);
  const [showQr, setShowQr] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [charging, setCharging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Guards against a second submission before React re-renders the disabled
  // button — prevents duplicate sales from a fast double-tap. A ref is used
  // (not state) so the guard is effective synchronously.
  const inFlight = useRef(false);

  const available = useMemo(
    () => (items ?? []).filter((i) => i.available),
    [items]
  );
  const currentCategory = activeCategory ?? categories[0] ?? null;
  const trimmedQuery = query.trim().toLowerCase();
  const searching = trimmedQuery.length > 0;
  // When searching, match across every category by name; otherwise show the
  // selected category. This keeps the fast category flow but lets the cashier
  // jump straight to any item in a long menu.
  const visibleItems = searching
    ? available.filter((i) => i.name.toLowerCase().includes(trimmedQuery))
    : available.filter((i) => i.category === currentCategory);

  // Auto-dismiss the "added" toast.
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 1600);
    return () => clearTimeout(t);
  }, [toast]);

  function addToOrder(item: MenuItem, selectedModifiers: SelectedModifier[]) {
    addItem({ item, selectedModifiers });
    setToast(`Added ${item.name}`);
  }

  function handleTapItem(item: MenuItem) {
    if (item.modifierGroups.length === 0) {
      addToOrder(item, []);
    } else {
      setPicking(item);
    }
  }

  async function finalizeSale() {
    if (inFlight.current) return; // duplicate-submit guard
    inFlight.current = true;
    setError(null);
    setCharging(true);
    try {
      const saleId = await completeSale(payment);
      setShowQr(false);
      navigate(`/receipt/${saleId}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not complete the sale.'
      );
      inFlight.current = false; // allow retry only on failure
      setCharging(false);
    }
  }

  function handleCharge() {
    if (payment === PaymentType.GCASH) {
      setShowPayment(false);
      setShowQr(true);
    } else {
      void finalizeSale();
    }
  }

  return (
    <section className={isEmpty ? undefined : 'has-charge-bar'}>
      <h1 className="page-title" style={{ marginTop: 0 }}>
        Checkout
      </h1>

      {loading && <p className="muted">Loading…</p>}

      {!loading && (
        <div className="field" style={{ marginBottom: 12 }}>
          <input
            className="input"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search the menu…"
            aria-label="Search the menu"
          />
        </div>
      )}

      {!loading && !searching && categories.length > 0 && (
        <div className="tabs" role="group" aria-label="Menu categories">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              aria-pressed={cat === currentCategory}
              className={`tab ${cat === currentCategory ? 'tab-active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      <div className="menu-grid">
        {visibleItems.map((item) => (
          <button
            key={item.id}
            type="button"
            className="menu-tile"
            onClick={() => handleTapItem(item)}
            aria-label={`Add ${item.name}`}
          >
            <strong className="item-name">{item.name}</strong>
            {item.modifierGroups.length > 0 && (
              <span className="badge">Customizable</span>
            )}
            <span className="price">{formatMoney(item.basePrice)}</span>
          </button>
        ))}
        {!loading && visibleItems.length === 0 && (
          <p className="muted">
            {searching
              ? `No items match “${query}”.`
              : 'No items available in this category.'}
          </p>
        )}
      </div>

      <div className="section-label">
        Order {count > 0 && `· ${count} item${count === 1 ? '' : 's'}`}
      </div>

      {isEmpty && (
        <div className="empty">
          <span className="empty-icon" aria-hidden>
            <Icon name="bag" size={28} />
          </span>
          <p>Your order is empty.
            <br />Tap an item above to begin.</p>
        </div>
      )}

      {lines.map((line) => (
        <div className="card" key={line.key}>
          <div className="row">
            <strong className="item-name">{line.name}</strong>
            <span className="spacer" />
            <span className="price">{formatMoney(lineTotal(line))}</span>
          </div>
          {line.selectedModifiers.length > 0 && (
            <div className="muted" style={{ fontSize: '0.82rem', marginTop: 4 }}>
              {line.selectedModifiers.map((m) => m.optionName).join(', ')} ·{' '}
              {formatMoney(line.unitPrice)} each
            </div>
          )}
          <div className="row" style={{ marginTop: 12 }}>
            <button
              type="button"
              className="qty-btn"
              aria-label={`Decrease ${line.name}`}
              onClick={() => setQuantity(line.key, line.quantity - 1)}
            >
              <Icon name="minus" size={18} />
            </button>
            <span
              className="qty"
              style={{ minWidth: 28, textAlign: 'center', fontWeight: 700 }}
              aria-label={`${line.name} quantity`}
            >
              {line.quantity}
            </span>
            <button
              type="button"
              className="qty-btn"
              aria-label={`Increase ${line.name}`}
              onClick={() => setQuantity(line.key, line.quantity + 1)}
            >
              <Icon name="plus" size={18} />
            </button>
            <span className="spacer" />
            <button
              type="button"
              className="qty-btn"
              aria-label={`Remove ${line.name}`}
              onClick={() => removeItem(line.key)}
            >
              <Icon name="trash" size={18} />
            </button>
          </div>
        </div>
      ))}

      {!isEmpty && (
        <div className="paybar paybar-slim">
          <button
            type="button"
            className="btn charge-bar"
            onClick={() => {
              setError(null);
              setShowPayment(true);
            }}
            aria-label={`Review and charge ${formatMoney(total)} for ${count} item${count === 1 ? '' : 's'}`}
          >
            <span className="charge-bar-amount">
              <span className="charge-bar-count">
                {count} item{count === 1 ? '' : 's'}
              </span>
              <span className="charge-bar-total" aria-label="Order total">
                {formatMoney(total)}
              </span>
            </span>
            <span className="charge-bar-action">
              Charge
              <Icon name="chevron-right" size={20} />
            </span>
          </button>
        </div>
      )}

      {showPayment && !isEmpty && (
        <Sheet title="Payment" onClose={() => setShowPayment(false)}>
          <div className="row" style={{ marginBottom: 14 }}>
            <span className="label" style={{ color: 'var(--color-muted)', fontWeight: 600 }}>
              Total · {count} item{count === 1 ? '' : 's'}
            </span>
            <span className="spacer" />
            <span
              className="amount price"
              style={{ fontSize: '1.5rem', fontWeight: 800 }}
              aria-label="Order total"
            >
              {formatMoney(total)}
            </span>
          </div>

          <div className="segment" role="group" aria-label="Payment method">
            <button
              type="button"
              aria-pressed={payment === PaymentType.CASH}
              onClick={() => setPayment(PaymentType.CASH)}
            >
              <Icon name="cash" size={18} />
              Cash
            </button>
            <button
              type="button"
              aria-pressed={payment === PaymentType.GCASH}
              onClick={() => setPayment(PaymentType.GCASH)}
            >
              <Icon name="gcash" size={18} />
              GCash
            </button>
          </div>

          {error && (
            <p
              style={{ color: 'var(--color-danger)', margin: '0 0 10px' }}
              role="alert"
            >
              {error}
            </p>
          )}

          <button
            type="button"
            className="btn"
            onClick={handleCharge}
            disabled={charging}
          >
            {charging ? (
              'Processing…'
            ) : (
              <>
                <Icon name={payment === PaymentType.GCASH ? 'gcash' : 'cash'} size={20} />
                {`Charge ${formatMoney(total)}`}
              </>
            )}
          </button>
          <button
            type="button"
            className="btn btn-danger"
            style={{ marginTop: 10 }}
            aria-label="Clear order"
            onClick={() => {
              setShowPayment(false);
              setConfirmClear(true);
            }}
          >
            <Icon name="trash" size={20} />
            Clear order
          </button>
        </Sheet>
      )}

      {toast && (
        <div className="toast" role="status" aria-live="polite">
          {toast}
        </div>
      )}

      {picking && (
        <ModifierPicker
          item={picking}
          onCancel={() => setPicking(null)}
          onConfirm={(selected) => {
            addToOrder(picking, selected);
            setPicking(null);
          }}
        />
      )}

      {showQr && (
        <GcashQrModal
          amount={total}
          busy={charging}
          onCancel={() => setShowQr(false)}
          onConfirm={() => void finalizeSale()}
        />
      )}

      {confirmClear && (
        <Sheet title="Clear this order?" onClose={() => setConfirmClear(false)}>
          <p className="muted" style={{ marginTop: 0 }}>
            This removes all {count} item{count === 1 ? '' : 's'} from the current
            order. This cannot be undone.
          </p>
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => {
              clear();
              setConfirmClear(false);
              setToast('Order cleared');
            }}
          >
            <Icon name="trash" size={20} />
            Yes, clear order
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ marginTop: 10 }}
            onClick={() => setConfirmClear(false)}
          >
            Keep order
          </button>
        </Sheet>
      )}
    </section>
  );
}

/**
 * Modal to pick sizes/flavours/add-ons for an item before adding to the order.
 * Single-select groups behave like radios; multiple-select like checkboxes.
 * Required single-select groups must have a choice before confirming.
 */
function ModifierPicker({
  item,
  onCancel,
  onConfirm,
}: {
  item: MenuItem;
  onCancel: () => void;
  onConfirm: (selected: SelectedModifier[]) => void;
}) {
  const [selection, setSelection] = useState<Record<string, string[]>>(() => {
    const init: Record<string, string[]> = {};
    for (const g of item.modifierGroups) {
      // Preselect the first option of required single-select groups so the
      // picker opens already valid and confirmable in one tap (3-Tap Rule).
      // The cashier only needs to interact to change the default. Multiple-
      // select and optional groups start empty.
      init[g.id] =
        g.required && g.selectionType === 'single' && g.options.length > 0
          ? [g.options[0].id]
          : [];
    }
    return init;
  });

  function toggle(groupId: string, optionId: string, single: boolean) {
    setSelection((prev) => {
      const current = prev[groupId] ?? [];
      if (single) return { ...prev, [groupId]: [optionId] };
      return {
        ...prev,
        [groupId]: current.includes(optionId)
          ? current.filter((o) => o !== optionId)
          : [...current, optionId],
      };
    });
  }

  const selected: SelectedModifier[] = item.modifierGroups.flatMap((g) =>
    (selection[g.id] ?? [])
      .map((optId) => {
        const opt = g.options.find((o) => o.id === optId);
        return opt
          ? { groupName: g.name, optionName: opt.name, priceDelta: opt.priceDelta }
          : null;
      })
      .filter((m): m is SelectedModifier => m !== null)
  );

  const missingRequired = item.modifierGroups.filter(
    (g) => g.required && (selection[g.id]?.length ?? 0) === 0
  );
  const canConfirm = missingRequired.length === 0;

  const unitPrice = computeUnitPrice(item.basePrice, selected);

  return (
    <Sheet title={item.name} onClose={onCancel}>
      {item.modifierGroups.map((g) => {
        const unsatisfied =
          g.required && (selection[g.id]?.length ?? 0) === 0;
        return (
          <div key={g.id} className="field">
            <label>
              {g.name}
              {g.required && (
                <span
                  className="muted"
                  style={unsatisfied ? { color: 'var(--color-danger)' } : undefined}
                >
                  {' '}
                  · required
                </span>
              )}
            </label>
            <div className="options">
              {g.options.map((opt) => {
                const checked = (selection[g.id] ?? []).includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    className={`option ${checked ? 'option-active' : ''}`}
                    aria-pressed={checked}
                    onClick={() =>
                      toggle(g.id, opt.id, g.selectionType === 'single')
                    }
                  >
                    {checked && <Icon name="check" size={15} />}
                    <span>{opt.name}</span>
                    {opt.priceDelta !== 0 && (
                      <span className="muted">
                        {opt.priceDelta > 0 ? '+' : ''}
                        {formatMoney(opt.priceDelta)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      <div className="row" style={{ margin: '14px 0 4px' }}>
        <strong>Unit price</strong>
        <span className="spacer" />
        <strong aria-label="Unit price" className="price">
          {formatMoney(unitPrice)}
        </strong>
      </div>

      <button
        type="button"
        className="btn"
        disabled={!canConfirm}
        onClick={() => onConfirm(selected)}
      >
        {canConfirm ? (
          <>
            <Icon name="plus" size={20} />
            Add to order
          </>
        ) : (
          `Choose ${missingRequired[0].name}`
        )}
      </button>
    </Sheet>
  );
}

/** Shows the stall's GCash QR for the customer to scan, then confirm payment. */
function GcashQrModal({
  amount,
  busy,
  onCancel,
  onConfirm,
}: {
  amount: number;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Sheet title="Pay with GCash" onClose={onCancel} style={{ textAlign: 'center' }}>
      <p className="muted" style={{ margin: '0 0 14px' }}>
        Scan to pay{' '}
        <strong style={{ color: 'var(--color-text)' }}>
          {formatMoney(amount)}
        </strong>
      </p>
      <img
        src="/gcash-qr.png"
        alt="GCash QR code"
        className="qr-image"
        width={240}
        height={240}
      />
      <button
        type="button"
        className="btn"
        style={{ marginTop: 18 }}
        disabled={busy}
        onClick={onConfirm}
      >
        <Icon name="check" size={20} />
        {busy ? 'Processing…' : 'Payment received'}
      </button>
      <button
        type="button"
        className="btn btn-secondary"
        style={{ marginTop: 10 }}
        onClick={onCancel}
      >
        Cancel
      </button>
    </Sheet>
  );
}
