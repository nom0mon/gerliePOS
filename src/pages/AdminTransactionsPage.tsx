import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { saleRepo } from '../repositories/saleRepo';
import { formatMoney } from '../utils/money';
import type { Sale } from '../types';
import Icon from '../components/Icon';
import Sheet from '../components/Sheet';

/**
 * Admin · Transactions — every sale (active + voided). An accidental sale is
 * fixed by *voiding* it (soft delete): the record is kept for the audit trail
 * but excluded from Reports totals. Nothing is ever hard-deleted here.
 */
export default function AdminTransactionsPage() {
  const sales = useLiveQuery(() => saleRepo.listAll(), []);
  const [voiding, setVoiding] = useState<Sale | null>(null);

  return (
    <section>
      <h1 className="page-title">Transactions</h1>

      {!sales && <p className="muted">Loading…</p>}
      {sales && sales.length === 0 && (
        <p className="muted">No transactions yet.</p>
      )}

      {sales?.map((sale) => (
        <div className="card" key={sale.id}>
          <div className="row">
            <strong style={{ opacity: sale.voided ? 0.55 : 1 }}>
              Sale #{sale.id}
            </strong>
            {sale.voided && (
              <span
                className="badge"
                style={{
                  background: 'var(--color-danger-soft)',
                  color: 'var(--color-danger)',
                }}
              >
                Voided
              </span>
            )}
            <span className="spacer" />
            <span
              className="price"
              style={
                sale.voided
                  ? { textDecoration: 'line-through', opacity: 0.6 }
                  : undefined
              }
            >
              {formatMoney(sale.total)}
            </span>
          </div>
          <div className="muted" style={{ fontSize: '0.8rem', marginTop: 2 }}>
            {new Date(sale.timestamp).toLocaleString()} ·{' '}
            {sale.items.reduce((n, i) => n + i.quantity, 0)} item(s) ·{' '}
            {sale.paymentType}
          </div>
          <div className="row" style={{ marginTop: 12 }}>
            <Link
              to={`/receipt/${sale.id}`}
              className="btn btn-secondary"
              style={{ width: 'auto' }}
            >
              <Icon name="receipt" size={18} />
              Receipt
            </Link>
            <span className="spacer" />
            {!sale.voided && (
              <button
                type="button"
                className="btn btn-danger"
                style={{ width: 'auto' }}
                aria-label={`Void sale #${sale.id}`}
                onClick={() => setVoiding(sale)}
              >
                <Icon name="ban" size={18} />
                Void
              </button>
            )}
          </div>
        </div>
      ))}

      {voiding && (
        <Sheet title={`Void sale #${voiding.id}?`} onClose={() => setVoiding(null)}>
          <p className="muted" style={{ marginTop: 0 }}>
            Voiding removes {formatMoney(voiding.total)} from the day's totals.
            The transaction is kept and will appear in the Audit log. This cannot
            be undone.
          </p>
          <button
            type="button"
            className="btn btn-danger"
            onClick={async () => {
              if (voiding.id != null) await saleRepo.voidSale(voiding.id);
              setVoiding(null);
            }}
          >
            <Icon name="ban" size={20} />
            Void transaction
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ marginTop: 10 }}
            onClick={() => setVoiding(null)}
          >
            Keep transaction
          </button>
        </Sheet>
      )}
    </section>
  );
}
