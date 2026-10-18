import { Link } from 'react-router-dom';
import { useRxData } from '../hooks/useRxData';
import { saleRepo } from '../repositories/saleRepo';
import { formatMoney } from '../utils/money';
import Icon from '../components/Icon';

/**
 * Admin · Audit — the record of voided (soft-deleted) transactions. Because a
 * void keeps the sale rather than erasing it, this is the audit trail for
 * accidental/cancelled transactions: what was voided, its value, and when.
 */
export default function AdminAuditPage() {
  const voided = useRxData(() => saleRepo.listVoided(), []);

  return (
    <section>
      <h1 className="page-title">Audit · Voided</h1>
      <p className="muted" style={{ marginTop: '-8px' }}>
        Transactions that were voided. Kept for records; excluded from totals.
      </p>

      {!voided && <p className="muted">Loading…</p>}
      {voided && voided.length === 0 && (
        <div className="empty">
          <span className="empty-icon" aria-hidden>
            <Icon name="ban" size={28} />
          </span>
          <p>No voided transactions.</p>
        </div>
      )}

      {voided?.map((sale) => (
        <Link
          to={`/receipt/${sale.id}`}
          className="card txn-row"
          key={sale.id}
          aria-label={`View voided sale #${sale.id}, ${formatMoney(sale.total)}`}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="row">
              <strong>Sale #{sale.id}</strong>
              <span
                className="badge"
                style={{
                  background: 'var(--color-danger-soft)',
                  color: 'var(--color-danger)',
                }}
              >
                Voided
              </span>
              <span className="spacer" />
              <span
                className="price"
                style={{ textDecoration: 'line-through', opacity: 0.6 }}
              >
                {formatMoney(sale.total)}
              </span>
            </div>
            <div className="muted" style={{ fontSize: '0.78rem', marginTop: 2 }}>
              {sale.items.reduce((n, i) => n + i.quantity, 0)} item(s) ·{' '}
              {sale.paymentType}
            </div>
            <div className="muted" style={{ fontSize: '0.78rem' }}>
              Sold {new Date(sale.timestamp).toLocaleString()}
            </div>
            {sale.voidedAt && (
              <div
                className="muted"
                style={{ fontSize: '0.78rem', color: 'var(--color-danger)' }}
              >
                Voided {new Date(sale.voidedAt).toLocaleString()}
              </div>
            )}
          </div>
          <Icon name="chevron-left" size={18} className="txn-chevron" />
        </Link>
      ))}
    </section>
  );
}
