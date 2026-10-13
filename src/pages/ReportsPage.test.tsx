import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
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
        menuItemId: 1,
        name: 'Item',
        basePrice: total,
        selectedModifiers: [],
        unitPrice: total,
        quantity: 1,
        lineTotal: total,
      },
    ],
  };
}

function renderReports() {
  return render(
    <MemoryRouter>
      <ReportsPage />
    </MemoryRouter>
  );
}

beforeEach(async () => {
  await db.sales.clear();
});

describe('ReportsPage', () => {
  it("shows today's total and transaction count", async () => {
    const today = dateKeyOf();
    await db.sales.bulkAdd([makeSale(today, 40), makeSale(today, 60)]);

    renderReports();

    await waitFor(() =>
      expect(screen.getByLabelText('Daily total')).toHaveTextContent('100.00')
    );
    expect(screen.getByLabelText('Transaction count')).toHaveTextContent(
      '2 transactions'
    );
  });

  it('updates the total when a different date is selected', async () => {
    const today = dateKeyOf();
    await db.sales.bulkAdd([makeSale(today, 50), makeSale('2000-01-01', 99)]);

    renderReports();

    await waitFor(() =>
      expect(screen.getByLabelText('Daily total')).toHaveTextContent('50.00')
    );

    const dateInput = screen.getByLabelText(/date/i);
    fireEvent.change(dateInput, { target: { value: '2000-01-01' } });

    await waitFor(() =>
      expect(screen.getByLabelText('Daily total')).toHaveTextContent('99.00')
    );
  });

  it('shows an empty message when there are no sales for the day', async () => {
    renderReports();
    expect(await screen.findByText(/no sales on this day/i)).toBeInTheDocument();
  });

  it('links each transaction to its receipt', async () => {
    const today = dateKeyOf();
    const id = await db.sales.add(makeSale(today, 42));

    renderReports();

    const link = await screen.findByRole('link', {
      name: /view receipt for sale/i,
    });
    expect(link).toHaveAttribute('href', `/receipt/${id}`);
  });
});
