import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { PaymentType, type Sale } from '../types';
import ReceiptPage from './ReceiptPage';
import { resetStore, seedSale as seedSaleDoc } from '../test/storeTestUtils';
import { newId } from '../db/rxdb';

beforeEach(async () => {
  await resetStore();
});

function renderReceiptAt(id: string) {
  return render(
    <MemoryRouter initialEntries={[`/receipt/${id}`]}>
      <Routes>
        <Route path="/receipt/:saleId" element={<ReceiptPage />} />
        <Route path="/" element={<div>Checkout screen</div>} />
      </Routes>
    </MemoryRouter>
  );
}

async function seedSale(): Promise<string> {
  const sale: Sale = {
    id: newId(),
    timestamp: Date.now(),
    dateKey: '2026-01-01',
    total: 94,
    paymentType: PaymentType.GCASH,
    items: [
      {
        menuItemId: 'm1',
        name: 'Iced Coffee',
        basePrice: 59,
        selectedModifiers: [
          { groupName: 'Size', optionName: 'Large', priceDelta: 20 },
          { groupName: 'Add-ons', optionName: 'Pearls', priceDelta: 15 },
        ],
        unitPrice: 94,
        quantity: 1,
        lineTotal: 94,
      },
    ],
    businessId: 'local-business',
    updatedAt: Date.now(),
    isDeleted: false,
  };
  return seedSaleDoc(sale);
}

describe('ReceiptPage', () => {
  it('renders the line items, chosen modifiers, total and payment type', async () => {
    const id = await seedSale();
    renderReceiptAt(id);

    expect(await screen.findByText('Iced Coffee')).toBeInTheDocument();
    // Modifiers summarised on the line.
    expect(screen.getByText(/Large, Pearls/)).toBeInTheDocument();
    expect(screen.getByLabelText('Receipt total')).toHaveTextContent('94.00');
    expect(screen.getByText('GCASH')).toBeInTheDocument();
    // Store header (thermal layout, uppercase store name).
    expect(screen.getByText('KAFFEED')).toBeInTheDocument();
  });

  it('renders the thermal-receipt sections and amount in words', async () => {
    const id = await seedSale();
    renderReceiptAt(id);

    await screen.findByText('KAFFEED');

    // Metadata.
    expect(screen.getByText(/^TRN#:/)).toBeInTheDocument();
    expect(screen.getByText(`#${id}`)).toBeInTheDocument();
    // Order section header.
    expect(screen.getByText('-- ORDER --')).toBeInTheDocument();
    // Per-item quantity @ unit price line.
    expect(screen.getByText(/1 @/)).toBeInTheDocument();
    // Totals block.
    expect(screen.getByText('SUBTOTAL')).toBeInTheDocument();
    expect(screen.getByText(/^TAX /)).toBeInTheDocument();
    // Amount in words (total 94 → Ninety-Four Pesos).
    expect(screen.getByText(/Amount in Words:/)).toBeInTheDocument();
    expect(screen.getByText('Ninety-Four Pesos')).toBeInTheDocument();
    // Barcode with zero-padded TRN beneath + footer.
    const trn = String(id).padStart(6, '0');
    expect(screen.getByLabelText(`Barcode ${trn}`)).toBeInTheDocument();
    expect(
      screen.getByText(/thank you! we hope to see you again/i)
    ).toBeInTheDocument();
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
    renderReceiptAt('nonexistent-id');
    expect(await screen.findByText(/sale not found/i)).toBeInTheDocument();
  });
});
