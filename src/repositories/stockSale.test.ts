import { describe, it, expect, beforeEach } from 'vitest';
import { menuRepo } from './menuRepo';
import { stockRepo } from './stockRepo';
import { saleRepo } from './saleRepo';
import { getDb } from '../db/rxdb';
import { resetStore } from '../test/storeTestUtils';
import { PaymentType, type MenuItem } from '../types';

async function qty(id: string): Promise<number | undefined> {
  const db = await getDb();
  const doc = await db.menuitems.findOne(id).exec();
  return doc ? (doc.toJSON() as MenuItem).stockQty : undefined;
}

beforeEach(async () => {
  await resetStore();
});

async function trackedItem(name: string, stock: number): Promise<string> {
  const id = await menuRepo.add({ name, category: 'C', basePrice: 10 });
  await stockRepo.configure(id, { trackStock: true, stockQty: stock, lowStockThreshold: 1 });
  return id;
}

function line(menuItemId: string, quantity: number) {
  return {
    menuItemId,
    name: `item-${menuItemId}`,
    basePrice: 10,
    selectedModifiers: [],
    unitPrice: 10,
    quantity,
  };
}

describe('stock ↔ sale integration', () => {
  it('decrements tracked stock on sale', async () => {
    const id = await trackedItem('Burger', 5);
    await saleRepo.completeSale([line(id, 2)], PaymentType.CASH);
    expect(await qty(id)).toBe(3);
  });

  it('combines multiple lines of the same item (e.g. different modifiers)', async () => {
    const id = await trackedItem('Burger', 5);
    await saleRepo.completeSale([line(id, 2), line(id, 1)], PaymentType.CASH);
    expect(await qty(id)).toBe(2);
  });

  it('never drives stock below zero', async () => {
    const id = await trackedItem('Burger', 1);
    await saleRepo.completeSale([line(id, 5)], PaymentType.CASH);
    expect(await qty(id)).toBe(0);
  });

  it('leaves untracked items alone', async () => {
    const id = await menuRepo.add({ name: 'Fries', category: 'C', basePrice: 10 });
    await saleRepo.completeSale([line(id, 3)], PaymentType.CASH);
    const db = await getDb();
    const row = (await db.menuitems.findOne(id).exec())!.toJSON() as MenuItem;
    expect(row.trackStock).toBeFalsy();
    expect(row.stockQty).toBeUndefined();
  });

  it('restores stock when a sale is voided', async () => {
    const id = await trackedItem('Burger', 5);
    const saleId = await saleRepo.completeSale([line(id, 2)], PaymentType.CASH);
    expect(await qty(id)).toBe(3);
    await saleRepo.voidSale(saleId);
    expect(await qty(id)).toBe(5);
  });

  it('voiding twice restores stock only once', async () => {
    const id = await trackedItem('Burger', 5);
    const saleId = await saleRepo.completeSale([line(id, 2)], PaymentType.CASH);
    const first = await saleRepo.voidSale(saleId);
    const second = await saleRepo.voidSale(saleId);
    expect(first).toBe(1);
    expect(second).toBe(0);
    expect(await qty(id)).toBe(5);
  });

  it('an item selling out becomes not sellable on checkout', async () => {
    const id = await trackedItem('Burger', 2);
    await saleRepo.completeSale([line(id, 2)], PaymentType.CASH);
    const item = (await menuRepo.getById(id))!;
    expect(stockRepo.isSellable(item)).toBe(false);
  });
});
