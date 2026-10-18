import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PaymentType, type MenuItem } from '../types';
import { CartProvider, useCart } from './CartContext';
import { SalesProvider, useSales } from './SalesContext';
import { resetStore, salesCount } from '../test/storeTestUtils';
import { getDb } from '../db/rxdb';

const coffee: MenuItem = {
  id: 'm1',
  name: 'Iced Coffee',
  category: 'Drinks',
  basePrice: 59,
  available: true,
  modifierGroups: [],
};

/** Minimal harness exercising cart + sales together. */
function Harness() {
  const { count, addItem } = useCart();
  const { completeSale } = useSales();
  return (
    <div>
      <span data-testid="count">{count}</span>
      <button onClick={() => addItem({ item: coffee, selectedModifiers: [] })}>
        add
      </button>
      <button onClick={() => void completeSale(PaymentType.GCASH)}>charge</button>
    </div>
  );
}

beforeEach(async () => {
  await resetStore();
});

describe('SalesContext.completeSale', () => {
  it('persists the sale with the chosen payment type and clears the cart', async () => {
    const user = userEvent.setup();
    render(
      <CartProvider>
        <SalesProvider>
          <Harness />
        </SalesProvider>
      </CartProvider>
    );

    await user.click(screen.getByText('add'));
    await user.click(screen.getByText('add'));
    expect(screen.getByTestId('count')).toHaveTextContent('2');

    await user.click(screen.getByText('charge'));

    await waitFor(() =>
      expect(screen.getByTestId('count')).toHaveTextContent('0')
    );
    expect(await salesCount()).toBe(1);

    const db = await getDb();
    const sales = (await db.sales.find().exec()).map((d) => d.toJSON());
    expect(sales[0]).toMatchObject({
      total: 118, // 59 x 2
      paymentType: PaymentType.GCASH,
    });
    expect(sales[0].items[0]).toMatchObject({
      menuItemId: 'm1',
      name: 'Iced Coffee',
      unitPrice: 59,
      quantity: 2,
    });
  });
});
