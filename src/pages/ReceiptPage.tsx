import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import type { Sale } from '../types';
import { saleRepo } from '../repositories/saleRepo';
import { formatMoney } from '../utils/money';

type LoadState =
  | { status: 'loading' }
  | { status: 'notfound' }
  | { status: 'ready'; sale: Sale };

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
        <Link to="/checkout" className="btn btn-secondary">
          Back to checkout
        </Link>
      </section>
    );
  }

  const { sale } = state;

  return (
    <section>
      <h1 className="page-title">Receipt</h1>

      <div className="card receipt" aria-label="Receipt">
        <div style={{ textAlign: 'center', marginBottom: 12 }}>
          <strong>Mommy POS</strong>
          <div className="muted" style={{ fontSize: '0.8rem' }}>
            {new Date(sale.timestamp).toLocaleString()}
          </div>
          <div className="muted" style={{ fontSize: '0.8rem' }}>
            Sale #{sale.id}
          </div>
        </div>

        {sale.items.map((item) => (
          <div className="row" key={item.productId} style={{ marginBottom: 6 }}>
            <span>
              {item.name}
              <span className="muted">
                {' '}
                × {item.quantity} @ {formatMoney(item.unitPrice)}
              </span>
            </span>
            <span className="spacer" />
            <span>{formatMoney(item.lineTotal)}</span>
          </div>
        ))}

        <hr
          style={{
            border: 'none',
            borderTop: '1px dashed var(--color-border)',
            margin: '12px 0',
          }}
        />

        <div className="row">
          <strong>Total</strong>
          <span className="spacer" />
          <strong aria-label="Receipt total">{formatMoney(sale.total)}</strong>
        </div>
        <div className="row muted" style={{ fontSize: '0.85rem' }}>
          <span>Payment</span>
          <span className="spacer" />
          <span>{sale.paymentType}</span>
        </div>
      </div>

      <button
        type="button"
        className="btn no-print"
        onClick={() => window.print()}
      >
        Print / Share
      </button>
      <Link
        to="/checkout"
        className="btn btn-secondary no-print"
        style={{ marginTop: 10, display: 'block', textAlign: 'center' }}
      >
        New sale
      </Link>
    </section>
  );
}
