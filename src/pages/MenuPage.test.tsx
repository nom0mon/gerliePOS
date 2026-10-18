import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { MenuItem } from '../types';
import { MenuProvider } from '../context/MenuContext';
import { menuRepo } from '../repositories/menuRepo';
import { resetStore } from '../test/storeTestUtils';
import MenuPage from './MenuPage';

const ITEM: Omit<MenuItem, 'id'> = {
  name: 'Fish Ball',
  category: 'Street Foods',
  basePrice: 20,
  available: true,
  modifierGroups: [],
};

beforeEach(async () => {
  await resetStore();
  await menuRepo.add({ name: ITEM.name, category: ITEM.category, basePrice: ITEM.basePrice });
});

function renderMenu() {
  return render(
    <MenuProvider>
      <MenuPage />
    </MenuProvider>
  );
}

describe('MenuPage (quick service view)', () => {
  it('toggles item availability (sold out / back in)', async () => {
    const user = userEvent.setup();
    renderMenu();

    const soldOut = await screen.findByRole('button', {
      name: /mark fish ball sold out/i,
    });
    await user.click(soldOut);

    await waitFor(async () => {
      const items = await menuRepo.list();
      expect(items[0].available).toBe(false);
    });

    // Button flips to the inverse action.
    expect(
      await screen.findByRole('button', { name: /mark fish ball available/i })
    ).toBeInTheDocument();
  });

  it('does NOT expose product add or delete here (admin-only)', async () => {
    renderMenu();
    await screen.findByText('Fish Ball');

    // No add-product affordance.
    expect(
      screen.queryByRole('button', { name: /^add$/i })
    ).not.toBeInTheDocument();
    // No delete/remove affordance on this screen.
    expect(
      screen.queryByRole('button', { name: /delete fish ball|remove fish ball/i })
    ).not.toBeInTheDocument();
  });

  it('filters items by search query', async () => {
    await menuRepo.add({
      name: 'Kikiam',
      category: 'Street Foods',
      basePrice: 20,
    });
    const user = userEvent.setup();
    renderMenu();

    await screen.findByText('Fish Ball');
    await user.type(screen.getByLabelText(/^search$/i), 'kiki');

    expect(screen.getByText('Kikiam')).toBeInTheDocument();
    expect(screen.queryByText('Fish Ball')).not.toBeInTheDocument();
  });
});
