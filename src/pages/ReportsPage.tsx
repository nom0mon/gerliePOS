import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { saleRepo } from '../repositories/saleRepo';
import { dateKeyOf } from '../utils/date';
import { formatMoney } from '../utils/money';

export default function ReportsPage() {
  const [dateKey, setDateKey] = useState<string>(dateKeyOf());

  // Reactive: recomputes when the date changes or when new sales are recorded.
  const summary = useLiveQuery(() => saleRepo.dailyTotal(dateKey), [dateKey]);
  const sales = useLiveQuery(() => saleRepo.listByDate(dateKey), [dateKey]);

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
          aria-label="Daily total"
        >
          {summary ? formatMoney(summary.total) : '—'}
        </div>
        <div className="muted" aria-label="Transaction count">
          {summary?.count ?? 0} transaction
          {summary?.count === 1 ? '' : 's'}
        </div>
      </div>

      <h2 style={{ fontSize: '1rem' }}>Transactions</h2>
      {sales && sales.length === 0 && (
        <p className="muted">No sales on this day.</p>
      )}
      {sales?.map((sale) => (
        <div className="card" key={sale.id}>
          <div className="row">
            <strong>Sale #{sale.id}</strong>
            <span className="spacer" />
            <span>{formatMoney(sale.total)}</span>
          </div>
          <div className="muted" style={{ fontSize: '0.8rem' }}>
            {new Date(sale.timestamp).toLocaleTimeString()} ·{' '}
            {sale.items.reduce((n, i) => n + i.quantity, 0)} item(s) ·{' '}
            {sale.paymentType}
          </div>
        </div>
      ))}
    </section>
  );
}
