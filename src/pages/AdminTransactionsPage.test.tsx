import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { db } from '../db/db';
import { PaymentType, type Sale } from '../types';
import { saleRepo } from '../repositories/saleRepo';
import AdminTransactionsPage from './AdminTransactionsPage';

function sale(total: number): Sale {
  return {
    timestamp: Date.now(),
    dateKey: '2026-01-01',
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

beforeEach(async () => {
  await db.sales.clear();
});

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/admin/transactions']}>
      <Routes>
        <Route path="/admin/transactions" element={<AdminTransactionsPage />} />
        <Route path="/receipt/:saleId" element={<div>Receipt screen</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('AdminTransactionsPage', () => {
  it('voids a sale only after confirmation and shows a voided badge', async () => {
    const id = await db.sales.add(sale(70));
    const user = userEvent.setup();
    renderPage();

    // Tap Void → confirmation sheet; sale not yet voided.
    await user.click(
      await screen.findByRole('button', { name: /void sale #/i })
    );
    expect(
      await screen.findByRole('dialog', { name: /void sale #/i })
    ).toBeInTheDocument();
    expect((await saleRepo.getById(id))?.voided).toBeUndefined();

    // Cancel keeps it active.
    await user.click(screen.getByRole('button', { name: /keep transaction/i }));
    expect((await saleRepo.getById(id))?.voided).toBeUndefined();

    // Confirm actually voids it.
    await user.click(
      await screen.findByRole('button', { name: /void sale #/i })
    );
    await user.click(
      await screen.findByRole('button', { name: /void transaction/i })
    );

    await waitFor(async () =>
      expect((await saleRepo.getById(id))?.voided).toBe(true)
    );
    // Voided badge appears and the Void action is gone for that sale.
    expect(await screen.findByText('Voided')).toBeInTheDocument();
    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: /void sale #/i })
      ).not.toBeInTheDocument()
    );
  });
});
