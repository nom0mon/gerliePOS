import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { db } from '../db/db';
import type { Product } from '../types';
import { CartProvider, useCart } from './CartContext';
import { SalesProvider, useSales } from './SalesContext';

/** Minimal harness exercising cart + sales together. */
function Harness({ product }: { product: Product }) {
  const { count, addItem } = useCart();
  const { completeSale } = useSales();
  return (
    <div>
      <span data-testid="count">{count}</span>
      <button onClick={() => addItem(product)}>add</button>
      <button onClick={() => void completeSale()}>charge</button>
    </div>
  );
}

beforeEach(async () => {
  await db.products.clear();
  await db.sales.clear();
});

describe('SalesContext.completeSale', () => {
  it('persists the sale and clears the cart on success', async () => {
    const id = await db.products.add({
      name: 'Soda',
      price: 2.5,
      stockQuantity: 5,
      salesCount: 0,
    });
    const product: Product = {
      id,
      name: 'Soda',
      price: 2.5,
      stockQuantity: 5,
      salesCount: 0,
    };

    const user = userEvent.setup();
    render(
      <CartProvider>
        <SalesProvider>
          <Harness product={product} />
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
    expect(await db.sales.count()).toBe(1);
    const soda = await db.products.get(id);
    expect(soda).toMatchObject({ stockQuantity: 3, salesCount: 2 });
  });
});
