import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { db } from '../db/db';
import { CatalogProvider } from '../context/CatalogContext';
import CatalogPage from './CatalogPage';

beforeEach(async () => {
  await db.products.clear();
  await db.sales.clear();
});

function renderCatalog() {
  return render(
    <CatalogProvider>
      <CatalogPage />
    </CatalogProvider>
  );
}

describe('CatalogPage', () => {
  it('shows an empty state when there are no products', async () => {
    renderCatalog();
    expect(await screen.findByText(/no products yet/i)).toBeInTheDocument();
  });

  it('renders existing products from the database', async () => {
    await db.products.add({
      name: 'Seeded Soda',
      price: 2.5,
      stockQuantity: 7,
      salesCount: 3,
    });

    renderCatalog();

    expect(await screen.findByText('Seeded Soda')).toBeInTheDocument();
    expect(screen.getByText(/stock: 7/i)).toBeInTheDocument();
    expect(screen.getByText(/sold: 3/i)).toBeInTheDocument();
  });

  it('adds a new product through the form and shows it in the list', async () => {
    const user = userEvent.setup();
    renderCatalog();

    await user.click(screen.getByRole('button', { name: /\+ add/i }));
    await user.type(screen.getByLabelText(/name/i), 'New Candy');
    await user.type(screen.getByLabelText(/price/i), '1.25');
    await user.type(screen.getByLabelText(/stock quantity/i), '12');
    await user.click(screen.getByRole('button', { name: /save product/i }));

    expect(await screen.findByText('New Candy')).toBeInTheDocument();
    await waitFor(async () => {
      expect(await db.products.count()).toBe(1);
    });
  });

  it('rejects an empty name', async () => {
    const user = userEvent.setup();
    renderCatalog();

    await user.click(screen.getByRole('button', { name: /\+ add/i }));
    await user.type(screen.getByLabelText(/price/i), '1');
    await user.type(screen.getByLabelText(/stock quantity/i), '1');
    await user.click(screen.getByRole('button', { name: /save product/i }));

    expect(screen.getByText(/name is required/i)).toBeInTheDocument();
    expect(await db.products.count()).toBe(0);
  });
});
