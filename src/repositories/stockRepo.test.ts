import { describe, it, expect, beforeEach } from 'vitest';
import { menuRepo } from './menuRepo';
import { stockRepo, stockStatus, isSellable } from './stockRepo';
import { getDb } from '../db/rxdb';
import { resetStore } from '../test/storeTestUtils';
import type { MenuItem } from '../types';

async function raw(id: string) {
  const db = await getDb();
  const doc = await db.menuitems.findOne(id).exec();
  return doc ? (doc.toJSON() as MenuItem) : undefined;
}

beforeEach(async () => {
  await resetStore();
});

function item(partial: Partial<MenuItem>): MenuItem {
  return {
    name: 'X',
    category: 'C',
    basePrice: 10,
    available: true,
    modifierGroups: [],
    ...partial,
  };
}

describe('stockRepo pure classifiers', () => {
  it('stockStatus: untracked when not tracking', () => {
    expect(stockStatus(item({ trackStock: false }))).toBe('untracked');
    expect(stockStatus(item({}))).toBe('untracked');
  });

  it('stockStatus: out at or below zero', () => {
    expect(stockStatus(item({ trackStock: true, stockQty: 0 }))).toBe('out');
    expect(stockStatus(item({ trackStock: true, stockQty: -3 }))).toBe('out');
  });

  it('stockStatus: low at or below threshold but above zero', () => {
    expect(stockStatus(item({ trackStock: true, stockQty: 2, lowStockThreshold: 3 }))).toBe('low');
    expect(stockStatus(item({ trackStock: true, stockQty: 3, lowStockThreshold: 3 }))).toBe('low');
  });

  it('stockStatus: ok above threshold', () => {
    expect(stockStatus(item({ trackStock: true, stockQty: 10, lowStockThreshold: 3 }))).toBe('ok');
  });

  it('isSellable: untracked items follow the available flag', () => {
    expect(isSellable(item({ available: true }))).toBe(true);
    expect(isSellable(item({ available: false }))).toBe(false);
  });

  it('isSellable: tracked + out of stock is not sellable even if available', () => {
    expect(isSellable(item({ available: true, trackStock: true, stockQty: 0 }))).toBe(false);
    expect(isSellable(item({ available: true, trackStock: true, stockQty: 1 }))).toBe(true);
  });
});

describe('stockRepo persistence', () => {
  it('configure enables tracking and clamps negatives to 0', async () => {
    const id = await menuRepo.add({ name: 'Buns', category: 'C', basePrice: 5 });
    await stockRepo.configure(id, { trackStock: true, stockQty: -5, lowStockThreshold: -2 });
    const row = await raw(id);
    expect(row?.trackStock).toBe(true);
    expect(row?.stockQty).toBe(0);
    expect(row?.lowStockThreshold).toBe(0);
  });

  it('setQuantity is a no-op for untracked items', async () => {
    const id = await menuRepo.add({ name: 'Fries', category: 'C', basePrice: 5 });
    const updated = await stockRepo.setQuantity(id, 10);
    expect(updated).toBe(0);
    expect((await raw(id))?.stockQty).toBeUndefined();
  });

  it('adjustQuantity clamps at zero and returns the new quantity', async () => {
    const id = await menuRepo.add({ name: 'Buns', category: 'C', basePrice: 5 });
    await stockRepo.configure(id, { trackStock: true, stockQty: 2 });
    expect(await stockRepo.adjustQuantity(id, -5)).toBe(0);
    expect(await stockRepo.adjustQuantity(id, 3)).toBe(3);
  });
});
