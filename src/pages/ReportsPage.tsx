import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useRxData } from '../hooks/useRxData';
import { saleRepo } from '../repositories/saleRepo';
import { dateKeyOf } from '../utils/date';
import { formatMoney } from '../utils/money';
import Icon from '../components/Icon';

export default function ReportsPage() {
  const [dateKey, setDateKey] = useState<string>(dateKeyOf());

  // Reactive: recomputes when the date changes or when new sales are recorded.
  const summary = useRxData(() => saleRepo.dailyTotal(dateKey), [dateKey]);
  const sales = useRxData(() => saleRepo.listByDate(dateKey), [dateKey]);

  return (
    <section>
      <h1 className="page-title">Reports</h1>

      <div className="field">
        <label htmlFor="report-date">Date</label>
        <input
          id="report-date"
          className="input"
          type="date"
          value={dateKey}
          max={dateKeyOf()}
          onChange={(e) => setDateKey(e.target.value || dateKeyOf())}
        />
      </div>

      <div className="card">
        <div className="muted" style={{ fontSize: '0.85rem' }}>
          Daily total
        </div>
        <div
          style={{ fontSize: '2rem', fontWeight: 800 }}
          className="price"
          aria-label="Daily total"
        >
          {summary ? formatMoney(summary.total) : '—'}
        </div>
        <div className="muted" aria-label="Transaction count">
          {summary?.count ?? 0} transaction
          {summary?.count === 1 ? '' : 's'}
        </div>
      </div>

      <div className="section-label">Transactions</div>
      {sales && sales.length === 0 && (
        <p className="muted">No sales on this day.</p>
      )}
      {sales?.map((sale) => (
        <Link
          to={`/receipt/${sale.id}`}
          className="card txn-row"
          key={sale.id}
          aria-label={`View receipt for sale #${sale.id}, ${formatMoney(
            sale.total
          )}`}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="row">
              <strong>Sale #{sale.id}</strong>
              <span className="spacer" />
              <span className="price">{formatMoney(sale.total)}</span>
            </div>
            <div className="muted" style={{ fontSize: '0.8rem', marginTop: 2 }}>
              {new Date(sale.timestamp).toLocaleTimeString()} ·{' '}
              {sale.items.reduce((n, i) => n + i.quantity, 0)} item(s) ·{' '}
              {sale.paymentType}
            </div>
          </div>
          <Icon name="chevron-left" size={18} className="txn-chevron" />
        </Link>
      ))}
    </section>
  );
}
