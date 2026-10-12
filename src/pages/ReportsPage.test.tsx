import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { db } from '../db/db';
import { PaymentType, type Sale } from '../types';
import { dateKeyOf } from '../utils/date';
import ReportsPage from './ReportsPage';

function makeSale(dateKey: string, total: number): Sale {
  return {
    timestamp: Date.now(),
    dateKey,
    total,
    paymentType: PaymentType.CASH,
    items: [
      {
        productId: 1,
        name: 'Item',
        unitPrice: total,
        quantity: 1,
        lineTotal: total,
      },
    ],
  };
}

beforeEach(async () => {
  await db.sales.clear();
});

describe('ReportsPage', () => {
  it("shows today's total and transaction count", async () => {
    const today = dateKeyOf();
    await db.sales.bulkAdd([makeSale(today, 4), makeSale(today, 6)]);

    render(<ReportsPage />);

    await waitFor(() =>
      expect(screen.getByLabelText('Daily total')).toHaveTextContent('$10.00')
    );
    expect(screen.getByLabelText('Transaction count')).toHaveTextContent(
      '2 transactions'
    );
  });

  it('updates the total when a different date is selected', async () => {
    const today = dateKeyOf();
    await db.sales.bulkAdd([
      makeSale(today, 5),
      makeSale('2000-01-01', 99),
    ]);

    render(<ReportsPage />);

    await waitFor(() =>
      expect(screen.getByLabelText('Daily total')).toHaveTextContent('$5.00')
    );

    const dateInput = screen.getByLabelText(/date/i);
    fireEvent.change(dateInput, { target: { value: '2000-01-01' } });

    await waitFor(() =>
      expect(screen.getByLabelText('Daily total')).toHaveTextContent('$99.00')
    );
  });

  it('shows an empty message when there are no sales for the day', async () => {
    render(<ReportsPage />);
    expect(await screen.findByText(/no sales on this day/i)).toBeInTheDocument();
  });
});
