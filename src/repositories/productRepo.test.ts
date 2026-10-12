import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/db';
import { productRepo } from './productRepo';
import { seedIfEmpty } from '../db/seed';

beforeEach(async () => {
  await db.products.clear();
  await db.sales.clear();
});

describe('productRepo', () => {
  it('adds a product with salesCount initialised to 0 and returns an id', async () => {
    const id = await productRepo.add({
      name: 'Test Soda',
      price: 2.5,
      stockQuantity: 10,
    });

    expect(typeof id).toBe('number');
    const stored = await productRepo.getById(id);
    expect(stored).toMatchObject({
      id,
      name: 'Test Soda',
      price: 2.5,
      stockQuantity: 10,
      salesCount: 0,
    });
  });

  it('trims the product name on add', async () => {
    const id = await productRepo.add({
      name: '  Spacey  ',
      price: 1,
      stockQuantity: 1,
    });
    const stored = await productRepo.getById(id);
    expect(stored?.name).toBe('Spacey');
  });

  it('lists products ordered by name', async () => {
    await productRepo.add({ name: 'Banana', price: 1, stockQuantity: 1 });
    await productRepo.add({ name: 'Apple', price: 1, stockQuantity: 1 });
    await productRepo.add({ name: 'Cherry', price: 1, stockQuantity: 1 });

    const names = (await productRepo.list()).map((p) => p.name);
    expect(names).toEqual(['Apple', 'Banana', 'Cherry']);
  });

  it('returns undefined for a missing product', async () => {
    expect(await productRepo.getById(99999)).toBeUndefined();
  });

  it('updates an existing product', async () => {
    const id = await productRepo.add({
      name: 'Updatable',
      price: 1,
      stockQuantity: 5,
    });

    const updated = await productRepo.update(id, { stockQuantity: 8, price: 2 });
    expect(updated).toBe(1);

    const stored = await productRepo.getById(id);
    expect(stored).toMatchObject({ stockQuantity: 8, price: 2 });
  });
});

describe('seedIfEmpty', () => {
  it('seeds sample products when the catalog is empty', async () => {
    const inserted = await seedIfEmpty();
    expect(inserted).toBeGreaterThan(0);
    expect(await db.products.count()).toBe(inserted);
  });

  it('does nothing when products already exist', async () => {
    await productRepo.add({ name: 'Existing', price: 1, stockQuantity: 1 });
    const inserted = await seedIfEmpty();
    expect(inserted).toBe(0);
    expect(await db.products.count()).toBe(1);
  });
});
