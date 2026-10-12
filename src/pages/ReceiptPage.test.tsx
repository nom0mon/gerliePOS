import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { db } from '../db/db';
import { PaymentType, type Sale } from '../types';
import ReceiptPage from './ReceiptPage';

beforeEach(async () => {
  await db.sales.clear();
});

function renderReceiptAt(id: number | string) {
  return render(
    <MemoryRouter initialEntries={[`/receipt/${id}`]}>
      <Routes>
        <Route path="/receipt/:saleId" element={<ReceiptPage />} />
        <Route path="/checkout" element={<div>Checkout screen</div>} />
      </Routes>
    </MemoryRouter>
  );
}

async function seedSale(): Promise<number> {
  const sale: Sale = {
    timestamp: Date.now(),
    dateKey: '2026-01-01',
    total: 6.75,
    paymentType: PaymentType.CASH,
    items: [
      {
        productId: 1,
        name: 'Soda',
        unitPrice: 2.5,
        quantity: 2,
        lineTotal: 5,
      },
      {
        productId: 2,
        name: 'Chips',
        unitPrice: 1.75,
        quantity: 1,
        lineTotal: 1.75,
      },
    ],
  };
  return db.sales.add(sale);
}

describe('ReceiptPage', () => {
  it('renders the line items, totals and payment type of a stored sale', async () => {
    const id = await seedSale();
    renderReceiptAt(id);

    expect(await screen.findByText('Soda')).toBeInTheDocument();
    expect(screen.getByText('Chips')).toBeInTheDocument();
    expect(screen.getByText('$5.00')).toBeInTheDocument();
    expect(screen.getByText('$1.75')).toBeInTheDocument();
    expect(screen.getByLabelText('Receipt total')).toHaveTextContent('$6.75');
    expect(screen.getByText('CASH')).toBeInTheDocument();
  });

  it('calls window.print when Print is tapped', async () => {
    const id = await seedSale();
    const printSpy = vi
      .spyOn(window, 'print')
      .mockImplementation(() => undefined);
    const user = userEvent.setup();

    renderReceiptAt(id);
    await user.click(await screen.findByRole('button', { name: /print/i }));

    expect(printSpy).toHaveBeenCalledOnce();
    printSpy.mockRestore();
  });

  it('shows a not-found message for a missing sale', async () => {
    renderReceiptAt(99999);
    expect(await screen.findByText(/sale not found/i)).toBeInTheDocument();
  });
});
