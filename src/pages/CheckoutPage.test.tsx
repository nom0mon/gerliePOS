import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { db } from '../db/db';
import { CatalogProvider } from '../context/CatalogContext';
import { CartProvider } from '../context/CartContext';
import { SalesProvider } from '../context/SalesContext';
import CheckoutPage from './CheckoutPage';

beforeEach(async () => {
  await db.products.clear();
  await db.sales.clear();
  await db.products.bulkAdd([
    { name: 'Soda', price: 2.5, stockQuantity: 3, salesCount: 0 },
    { name: 'Chips', price: 1.75, stockQuantity: 10, salesCount: 0 },
  ]);
});

function renderCheckout() {
  return render(
    <MemoryRouter initialEntries={['/checkout']}>
      <CatalogProvider>
        <CartProvider>
          <SalesProvider>
            <Routes>
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route
                path="/receipt/:saleId"
                element={<div>Receipt screen</div>}
              />
            </Routes>
          </SalesProvider>
        </CartProvider>
      </CatalogProvider>
    </MemoryRouter>
  );
}

describe('CheckoutPage', () => {
  it('adds a product to the cart and shows the running total', async () => {
    const user = userEvent.setup();
    renderCheckout();

    const addSoda = await screen.findByRole('button', {
      name: /add soda to cart/i,
    });
    await user.click(addSoda);
    await user.click(addSoda); // 2 x 2.50 = 5.00

    expect(screen.getByLabelText('Soda quantity')).toHaveTextContent('2');
    expect(screen.getByLabelText('Cart total')).toHaveTextContent('$5.00');
  });

  it('increments and decrements quantity with the controls', async () => {
    const user = userEvent.setup();
    renderCheckout();

    await user.click(
      await screen.findByRole('button', { name: /add chips to cart/i })
    );
    await user.click(screen.getByRole('button', { name: /increase chips/i }));
    expect(screen.getByLabelText('Chips quantity')).toHaveTextContent('2');

    await user.click(screen.getByRole('button', { name: /decrease chips/i }));
    expect(screen.getByLabelText('Chips quantity')).toHaveTextContent('1');
  });

  it('removes a line from the cart', async () => {
    const user = userEvent.setup();
    renderCheckout();

    await user.click(
      await screen.findByRole('button', { name: /add soda to cart/i })
    );
    expect(screen.getByLabelText('Soda quantity')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /remove soda/i }));
    expect(screen.queryByLabelText('Soda quantity')).not.toBeInTheDocument();
    expect(screen.getByText(/cart is empty/i)).toBeInTheDocument();
  });

  it('charges the cart as cash and navigates to the receipt', async () => {
    const user = userEvent.setup();
    renderCheckout();

    await user.click(
      await screen.findByRole('button', { name: /add soda to cart/i })
    );
    await user.click(screen.getByRole('button', { name: /charge/i }));

    await waitFor(() =>
      expect(screen.getByText(/receipt screen/i)).toBeInTheDocument()
    );
    expect(await db.sales.count()).toBe(1);
  });
});
