import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/db';
import { PaymentType } from '../types';
import {
  saleRepo,
  InsufficientStockError,
  EmptySaleError,
} from './saleRepo';
import { dateKeyOf } from '../utils/date';

async function seedProduct(
  name: string,
  price: number,
  stock: number
): Promise<number> {
  return db.products.add({
    name,
    price,
    stockQuantity: stock,
    salesCount: 0,
  });
}

beforeEach(async () => {
  await db.products.clear();
  await db.sales.clear();
});

describe('saleRepo.completeSale', () => {
  it('persists the sale, decrements stock, and increments salesCount', async () => {
    const sodaId = await seedProduct('Soda', 2.5, 10);
    const chipsId = await seedProduct('Chips', 1.75, 5);

    const saleId = await saleRepo.completeSale([
      { productId: sodaId, quantity: 2 },
      { productId: chipsId, quantity: 1 },
    ]);

    const sale = await saleRepo.getById(saleId);
    expect(sale).toBeDefined();
    expect(sale!.paymentType).toBe(PaymentType.CASH);
    expect(sale!.total).toBe(6.75); // 2*2.5 + 1*1.75
    expect(sale!.items).toHaveLength(2);
    expect(sale!.dateKey).toBe(dateKeyOf());

    const soda = await db.products.get(sodaId);
    const chips = await db.products.get(chipsId);
    expect(soda).toMatchObject({ stockQuantity: 8, salesCount: 2 });
    expect(chips).toMatchObject({ stockQuantity: 4, salesCount: 1 });
  });

  it('snapshots name and unit price into sale items', async () => {
    const id = await seedProduct('Coffee', 3.25, 4);
    const saleId = await saleRepo.completeSale([{ productId: id, quantity: 2 }]);
    const sale = await saleRepo.getById(saleId);
    expect(sale!.items[0]).toMatchObject({
      productId: id,
      name: 'Coffee',
      unitPrice: 3.25,
      quantity: 2,
      lineTotal: 6.5,
    });
  });

  it('rolls back entirely when any line has insufficient stock', async () => {
    const okId = await seedProduct('Water', 1, 10);
    const lowId = await seedProduct('Rare', 5, 1);

    await expect(
      saleRepo.completeSale([
        { productId: okId, quantity: 2 },
        { productId: lowId, quantity: 3 }, // only 1 in stock
      ])
    ).rejects.toBeInstanceOf(InsufficientStockError);

    // Nothing committed: no sale, and the first product's stock is untouched.
    expect(await db.sales.count()).toBe(0);
    const water = await db.products.get(okId);
    expect(water).toMatchObject({ stockQuantity: 10, salesCount: 0 });
  });

  it('throws EmptySaleError for an empty line list', async () => {
    await expect(saleRepo.completeSale([])).rejects.toBeInstanceOf(
      EmptySaleError
    );
  });
});

describe('saleRepo.dailyTotal', () => {
  it('sums totals and counts transactions for a given day', async () => {
    const id = await seedProduct('Thing', 2, 100);
    await saleRepo.completeSale([{ productId: id, quantity: 2 }]); // 4
    await saleRepo.completeSale([{ productId: id, quantity: 3 }]); // 6

    const today = await saleRepo.dailyTotal();
    expect(today.total).toBe(10);
    expect(today.count).toBe(2);
    expect(today.dateKey).toBe(dateKeyOf());
  });

  it('isolates totals by day', async () => {
    const id = await seedProduct('Thing', 2, 100);
    await saleRepo.completeSale([{ productId: id, quantity: 1 }]); // today, total 2

    // Insert a sale on a different day directly.
    await db.sales.add({
      timestamp: Date.now(),
      dateKey: '2000-01-01',
      items: [],
      total: 99,
      paymentType: PaymentType.CASH,
    });

    const today = await saleRepo.dailyTotal();
    expect(today.total).toBe(2);
    expect(today.count).toBe(1);

    const past = await saleRepo.dailyTotal('2000-01-01');
    expect(past.total).toBe(99);
    expect(past.count).toBe(1);
  });
});
