import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { db } from '../db/db';
import type { MenuItem } from '../types';
import { MenuProvider } from '../context/MenuContext';
import { menuRepo } from '../repositories/menuRepo';
import AdminProductsPage from './AdminProductsPage';

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
      options: [{ id: 'r', name: 'Regular', priceDelta: 0 }],
    },
  ],
};

beforeEach(async () => {
  await db.menuItems.clear();
  await db.sales.clear();
});

function renderPage() {
  return render(
    <MenuProvider>
      <AdminProductsPage />
    </MenuProvider>
  );
}

describe('AdminProductsPage', () => {
  it('edits a product name and price, preserving modifier groups', async () => {
    const id = await db.menuItems.add(COFFEE as MenuItem);
    const user = userEvent.setup();
    renderPage();

    await user.click(
      await screen.findByRole('button', { name: /edit iced coffee/i })
    );

    const nameField = await screen.findByLabelText(/^name$/i);
    await user.clear(nameField);
    await user.type(nameField, 'Cold Brew');

    const priceField = screen.getByLabelText(/base price/i);
    await user.clear(priceField);
    await user.type(priceField, '75');

    await user.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(async () => {
      const updated = await menuRepo.getById(id);
      expect(updated?.name).toBe('Cold Brew');
      expect(updated?.basePrice).toBe(75);
      // Modifier groups must survive an edit (form doesn't touch them).
      expect(updated?.modifierGroups).toHaveLength(1);
    });
  });

  it('deletes a product only after confirmation', async () => {
    const id = await db.menuItems.add(COFFEE as MenuItem);
    const user = userEvent.setup();
    renderPage();

    await user.click(
      await screen.findByRole('button', { name: /delete iced coffee/i })
    );
    // Confirmation sheet; not yet deleted.
    expect(
      await screen.findByRole('dialog', { name: /delete this product/i })
    ).toBeInTheDocument();
    expect(await menuRepo.getById(id)).toBeDefined();

    await user.click(screen.getByRole('button', { name: /delete product/i }));
    await waitFor(async () =>
      expect(await menuRepo.getById(id)).toBeUndefined()
    );
  });

  it('resets the menu to default after confirmation', async () => {
    // One custom item only.
    await db.menuItems.add({
      name: 'Custom Thing',
      category: 'X',
      basePrice: 1,
      available: true,
      modifierGroups: [],
    } as MenuItem);
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: /^reset$/i }));
    expect(
      await screen.findByRole('dialog', { name: /reset menu to default/i })
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: /reset to default menu/i })
    );

    await waitFor(async () => {
      const items = await menuRepo.list();
      expect(items.some((i) => i.name === 'Custom Thing')).toBe(false);
      expect(items.some((i) => i.name === 'FISH BALL')).toBe(true);
    });
  });
});
