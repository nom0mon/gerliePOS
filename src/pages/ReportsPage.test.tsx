import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PaymentType, type Sale } from '../types';
import { dateKeyOf } from '../utils/date';
import ReportsPage from './ReportsPage';
import { resetStore, seedSale } from '../test/storeTestUtils';
import { newId } from '../db/rxdb';

function makeSale(dateKey: string, total: number): Sale {
  return {
    id: newId(),
    timestamp: Date.now(),
    dateKey,
    total,
    paymentType: PaymentType.CASH,
    items: [
      {
        menuItemId: 'm1',
        name: 'Item',
        basePrice: total,
        selectedModifiers: [],
        unitPrice: total,
        quantity: 1,
        lineTotal: total,
      },
    ],
    businessId: 'local-business',
    updatedAt: Date.now(),
    isDeleted: false,
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
  await resetStore();
});

describe('ReportsPage', () => {
  it("shows today's total and transaction count", async () => {
    const today = dateKeyOf();
    await seedSale(makeSale(today, 40));
    await seedSale(makeSale(today, 60));

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
    await seedSale(makeSale(today, 50));
    await seedSale(makeSale('2000-01-01', 99));

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
    const id = await seedSale(makeSale(today, 42));

    renderReports();

    const link = await screen.findByRole('link', {
      name: /view receipt for sale/i,
    });
    expect(link).toHaveAttribute('href', `/receipt/${id}`);
  });
});
