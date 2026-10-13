import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { db } from '../db/db';
import type { MenuItem } from '../types';
import { MenuProvider } from '../context/MenuContext';
import { CartProvider } from '../context/CartContext';
import { SalesProvider } from '../context/SalesContext';
import CheckoutPage from './CheckoutPage';

const WATER: Omit<MenuItem, 'id'> = {
  name: 'Water',
  category: 'Drinks',
  basePrice: 20,
  available: true,
  modifierGroups: [],
};

const COFFEE: Omit<MenuItem, 'id'> = {
  name: 'Iced Coffee',
  category: 'Drinks',
  basePrice: 59,
  available: true,
  modifierGroups: [
    {
      id: 'size',
      name: 'Size',
      selectionType: 'single',
      required: true,
      options: [
        { id: 'regular', name: 'Regular', priceDelta: 0 },
        { id: 'large', name: 'Large', priceDelta: 20 },
      ],
    },
  ],
};

beforeEach(async () => {
  await db.menuItems.clear();
  await db.sales.clear();
  await db.menuItems.bulkAdd([WATER as MenuItem, COFFEE as MenuItem]);
});

function renderCheckout() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <MenuProvider>
        <CartProvider>
          <SalesProvider>
            <Routes>
              <Route path="/" element={<CheckoutPage />} />
              <Route
                path="/receipt/:saleId"
                element={<div>Receipt screen</div>}
              />
            </Routes>
          </SalesProvider>
        </CartProvider>
      </MenuProvider>
    </MemoryRouter>
  );
}

describe('CheckoutPage', () => {
  it('adds a no-modifier item directly and shows the running total', async () => {
    const user = userEvent.setup();
    renderCheckout();

    const addWater = await screen.findByRole('button', { name: /add water/i });
    await user.click(addWater);
    await user.click(addWater); // 2 x 20 = 40

    expect(screen.getByLabelText('Water quantity')).toHaveTextContent('2');
    expect(screen.getByLabelText('Order total')).toHaveTextContent('40.00');
  });

  it('opens the modifier picker for a customizable item and applies the price', async () => {
    const user = userEvent.setup();
    renderCheckout();

    await user.click(
      await screen.findByRole('button', { name: /add iced coffee/i })
    );

    // Modifier modal appears; choose "Large" (+20) then confirm.
    await user.click(await screen.findByRole('button', { name: /large/i }));
    await user.click(screen.getByRole('button', { name: /add to order/i }));

    // Line unit price should be 59 + 20 = 79.
    expect(screen.getByLabelText('Order total')).toHaveTextContent('79.00');
  });

  it('charges as cash and navigates to the receipt', async () => {
    const user = userEvent.setup();
    renderCheckout();

    await user.click(
      await screen.findByRole('button', { name: /add water/i })
    );
    await user.click(screen.getByRole('button', { name: /review and charge/i }));
    await user.click(await screen.findByRole('button', { name: /^charge/i }));

    await waitFor(() =>
      expect(screen.getByText(/receipt screen/i)).toBeInTheDocument()
    );
    expect(await db.sales.count()).toBe(1);
  });

  it('shows the GCash QR before completing a GCash sale', async () => {
    const user = userEvent.setup();
    renderCheckout();

    await user.click(
      await screen.findByRole('button', { name: /add water/i })
    );

    // Open the payment pop-up, select GCash, then charge → QR modal appears
    // (no sale yet).
    await user.click(screen.getByRole('button', { name: /review and charge/i }));
    await user.click(await screen.findByRole('button', { name: /^gcash$/i }));
    await user.click(screen.getByRole('button', { name: /^charge/i }));

    expect(await screen.findByAltText(/gcash qr code/i)).toBeInTheDocument();
    expect(await db.sales.count()).toBe(0);

    // Confirm payment received → sale persists and navigates.
    await user.click(screen.getByRole('button', { name: /payment received/i }));
    await waitFor(() =>
      expect(screen.getByText(/receipt screen/i)).toBeInTheDocument()
    );
    expect(await db.sales.count()).toBe(1);

    const sale = (await db.sales.toArray())[0];
    expect(sale.paymentType).toBe('GCASH');
  });

  it('requires confirmation before clearing the order', async () => {
    const user = userEvent.setup();
    renderCheckout();

    const addWater = await screen.findByRole('button', { name: /add water/i });
    await user.click(addWater);
    await user.click(addWater);
    expect(screen.getByLabelText('Water quantity')).toHaveTextContent('2');

    // Open the payment pop-up, tap Clear → a confirmation sheet appears; the
    // order is NOT yet cleared.
    await user.click(screen.getByRole('button', { name: /review and charge/i }));
    await user.click(
      await screen.findByRole('button', { name: /^clear order$/i })
    );
    expect(
      await screen.findByRole('dialog', { name: /clear this order/i })
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Water quantity')).toHaveTextContent('2');

    // Cancel keeps the order.
    await user.click(screen.getByRole('button', { name: /keep order/i }));
    expect(screen.getByLabelText('Water quantity')).toHaveTextContent('2');

    // Confirm actually clears it.
    await user.click(screen.getByRole('button', { name: /review and charge/i }));
    await user.click(
      await screen.findByRole('button', { name: /^clear order$/i })
    );
    await user.click(
      await screen.findByRole('button', { name: /yes, clear order/i })
    );
    await waitFor(() =>
      expect(screen.queryByLabelText('Water quantity')).not.toBeInTheDocument()
    );
    expect(screen.getByText(/your order is empty/i)).toBeInTheDocument();
  });

  it('does not create duplicate sales on a rapid double charge', async () => {
    const user = userEvent.setup();
    renderCheckout();

    await user.click(await screen.findByRole('button', { name: /add water/i }));

    await user.click(screen.getByRole('button', { name: /review and charge/i }));
    const charge = await screen.findByRole('button', { name: /^charge/i });
    // Fire two clicks back-to-back before navigation unmounts the button.
    await user.click(charge);
    await user.click(charge);

    await waitFor(() =>
      expect(screen.getByText(/receipt screen/i)).toBeInTheDocument()
    );
    // The in-flight guard must ensure exactly one sale was recorded.
    expect(await db.sales.count()).toBe(1);
  });

  it('preselects the default of a required single-select group (3-tap)', async () => {
    const user = userEvent.setup();
    renderCheckout();

    // Open the picker and confirm WITHOUT touching Size — "Regular" (the first
    // option, +0) should already be selected so Add is immediately available.
    await user.click(
      await screen.findByRole('button', { name: /add iced coffee/i })
    );
    const add = await screen.findByRole('button', { name: /add to order/i });
    expect(add).toBeEnabled();
    await user.click(add);

    // Base price only, default Regular applied.
    expect(screen.getByLabelText('Order total')).toHaveTextContent('59.00');
  });

  it('filters the menu across categories via search', async () => {
    const user = userEvent.setup();
    renderCheckout();

    // Both items visible initially (same category).
    await screen.findByRole('button', { name: /add water/i });
    expect(
      screen.getByRole('button', { name: /add iced coffee/i })
    ).toBeInTheDocument();

    await user.type(screen.getByLabelText(/search the menu/i), 'coffee');

    expect(
      screen.getByRole('button', { name: /add iced coffee/i })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /add water/i })
    ).not.toBeInTheDocument();
  });
});
