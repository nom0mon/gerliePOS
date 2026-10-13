import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import type { Sale } from '../types';
import { saleRepo } from '../repositories/saleRepo';
import { formatMoney } from '../utils/money';
import { amountToWords } from '../utils/numberToWords';
import { STORE_INFO } from '../utils/storeInfo';
import Icon from '../components/Icon';
import Barcode from '../components/Barcode';

type LoadState =
  | { status: 'loading' }
  | { status: 'notfound' }
  | { status: 'ready'; sale: Sale };

/** Tax rate applied on the receipt. Street-stall prices are tax-inclusive, so
 *  this is 0% — the line is shown to match the standard receipt layout. */
const TAX_RATE = 0;

/** MM/DD/YYYY for the receipt metadata row. */
function formatDate(ts: number): string {
  const d = new Date(ts);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${mm}/${dd}/${d.getFullYear()}`;
}

/** HH:MM:SS AM/PM for the receipt metadata row. */
function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

export default function ReceiptPage() {
  const { saleId } = useParams<{ saleId: string }>();
  const [state, setState] = useState<LoadState>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    const id = Number(saleId);
    if (!Number.isFinite(id)) {
      setState({ status: 'notfound' });
      return;
    }
    void saleRepo.getById(id).then((sale) => {
      if (!active) return;
      setState(sale ? { status: 'ready', sale } : { status: 'notfound' });
    });
    return () => {
      active = false;
    };
  }, [saleId]);

  if (state.status === 'loading') {
    return <p className="muted">Loading receipt…</p>;
  }

  if (state.status === 'notfound') {
    return (
      <section>
        <h1 className="page-title">Receipt</h1>
        <p className="muted">Sale not found.</p>
        <Link to="/" className="btn btn-secondary">
          Back to checkout
        </Link>
      </section>
    );
  }

  const { sale } = state;
  const trn = String(sale.id ?? 0).padStart(6, '0');
  const subtotal = sale.total; // tax-inclusive pricing
  const tax = +(subtotal * TAX_RATE).toFixed(2);

  return (
    <section>
      <div className="empty" style={{ padding: '8px 0 16px' }}>
        <span
          className="empty-icon"
          aria-hidden
          style={{
            background: 'var(--color-primary-soft)',
            color: 'var(--color-success)',
          }}
        >
          <Icon name="check" size={30} />
        </span>
        <strong style={{ fontSize: '1.1rem', color: 'var(--color-text)' }}>
          Sale complete
        </strong>
      </div>

      <div className="receipt-roll" aria-label="Receipt">
        {sale.voided && (
          <div className="rc-void-stamp" aria-label="Voided">
            *** VOIDED ***
          </div>
        )}

        {/* 1. Header */}
        <header className="rc-header">
          <span className="rc-logo" aria-hidden>
            <Icon name="coffee" size={22} />
          </span>
          <div className="rc-store-name">{STORE_INFO.name}</div>
          <div className="rc-store-sub">{STORE_INFO.tagline}</div>
          <div className="rc-store-sub">{STORE_INFO.address}</div>
          <div className="rc-store-sub">
            {STORE_INFO.phone} | {STORE_INFO.email}
          </div>
          <div className="rc-store-sub">{STORE_INFO.website}</div>
        </header>

        <div className="rc-divider rc-dashed" aria-hidden />

        {/* 2. Transaction metadata */}
        <div className="rc-meta">
          <div className="rc-line">
            <span>DATE: {formatDate(sale.timestamp)}</span>
            <span>{formatTime(sale.timestamp)}</span>
          </div>
          <div className="rc-line">
            <span>TRN#: {trn}</span>
          </div>
          <div className="rc-line">
            <span>SERVER:</span>
            <span>Cashier</span>
          </div>
          <div className="rc-line">
            <span>ORDER:</span>
            <span>#{sale.id}</span>
          </div>
        </div>

        <div className="rc-divider rc-dashed" aria-hidden />

        {/* 3. Order details */}
        <div className="rc-order-head">-- ORDER --</div>
        <div className="rc-items">
          {sale.items.map((item, idx) => (
            <div className="rc-item" key={idx}>
              <div className="rc-line">
                <span>{item.name}</span>
                <span>{formatMoney(item.lineTotal)}</span>
              </div>
              <div className="rc-item-sub">
                {item.quantity} @ {formatMoney(item.unitPrice)}
              </div>
              {item.selectedModifiers.length > 0 && (
                <div className="rc-item-sub">
                  {item.selectedModifiers.map((m) => m.optionName).join(', ')}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="rc-divider rc-double" aria-hidden />

        {/* 4. Totals */}
        <div className="rc-totals">
          <div className="rc-line">
            <span>SUBTOTAL</span>
            <span>{formatMoney(subtotal)}</span>
          </div>
          <div className="rc-line">
            <span>TAX {TAX_RATE * 100}%</span>
            <span>{formatMoney(tax)}</span>
          </div>
          <div className="rc-divider rc-solid" aria-hidden />
          <div className="rc-line rc-total">
            <strong>TOTAL</strong>
            <strong aria-label="Receipt total">{formatMoney(sale.total)}</strong>
          </div>
        </div>

        <div className="rc-divider rc-dashed" aria-hidden />

        {/* 5. Amount in words */}
        <div className="rc-words">
          <strong>Amount in Words:</strong>{' '}
          <em>{amountToWords(sale.total)}</em>
        </div>

        <div className="rc-divider rc-dashed" aria-hidden />

        {/* 6. Payment info */}
        <div className="rc-payment">
          <div className="rc-line">
            <span>PAYMENT</span>
            <span>{sale.paymentType}</span>
          </div>
          <div className="rc-line">
            <span>APPROVAL</span>
            <span>{trn}</span>
          </div>
        </div>

        {/* 7. Barcode & footer */}
        <div className="rc-barcode">
          <Barcode value={trn} />
        </div>

        <div className="rc-divider rc-dashed" aria-hidden />

        <div className="rc-footer">{STORE_INFO.footer}</div>
      </div>

      <button
        type="button"
        className="btn no-print"
        onClick={() => window.print()}
      >
        <Icon name="print" size={20} />
        Print / Share
      </button>
      <Link
        to="/"
        className="btn btn-secondary no-print"
        style={{ marginTop: 10 }}
      >
        <Icon name="chevron-left" size={18} />
        New sale
      </Link>
    </section>
  );
}
