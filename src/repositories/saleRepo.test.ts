import { describe, it, expect, beforeEach } from 'vitest';
import { PaymentType, type SelectedModifier } from '../types';
import { saleRepo, EmptySaleError, type SaleLineInput } from './saleRepo';
import { resetStore, seedSale } from '../test/storeTestUtils';
import { newId } from '../db/rxdb';
import { dateKeyOf } from '../utils/date';

function line(
  menuItemId: string,
  name: string,
  basePrice: number,
  quantity: number,
  selectedModifiers: SelectedModifier[] = []
): SaleLineInput {
  const unitPrice =
    basePrice + selectedModifiers.reduce((s, m) => s + m.priceDelta, 0);
  return { menuItemId, name, basePrice, selectedModifiers, unitPrice, quantity };
}

beforeEach(async () => {
  await resetStore();
});

describe('saleRepo.completeSale', () => {
  it('persists the sale and computes totals from resolved lines', async () => {
    const saleId = await saleRepo.completeSale(
      [
        line('m1', 'Iced Coffee', 59, 2, [
          { groupName: 'Size', optionName: 'Large', priceDelta: 20 },
        ]),
        line('m2', 'Fries', 40, 1),
      ],
      PaymentType.GCASH
    );
    expect(typeof saleId).toBe('string');
    const sale = await saleRepo.getById(saleId);
    expect(sale).toBeDefined();
    expect(sale!.paymentType).toBe(PaymentType.GCASH);
    expect(sale!.total).toBe(198);
    expect(sale!.items).toHaveLength(2);
    expect(sale!.dateKey).toBe(dateKeyOf());
  });

  it('snapshots name, base price, modifiers and lineTotal into items', async () => {
    const saleId = await saleRepo.completeSale([
      line('m1', 'Milk Tea', 69, 2, [
        { groupName: 'Flavour', optionName: 'Taro', priceDelta: 5 },
        { groupName: 'Add-ons', optionName: 'Pearls', priceDelta: 15 },
      ]),
    ]);
    const sale = await saleRepo.getById(saleId);
    expect(sale!.items[0]).toMatchObject({
      menuItemId: 'm1',
      name: 'Milk Tea',
      basePrice: 69,
      unitPrice: 89,
      quantity: 2,
      lineTotal: 178,
    });
    expect(sale!.items[0].selectedModifiers).toHaveLength(2);
  });

  it('defaults to CASH when no payment type is given', async () => {
    const saleId = await saleRepo.completeSale([line('m1', 'Water', 20, 1)]);
    const sale = await saleRepo.getById(saleId);
    expect(sale!.paymentType).toBe(PaymentType.CASH);
  });

  it('ignores zero-quantity lines', async () => {
    const saleId = await saleRepo.completeSale([
      line('m1', 'Water', 20, 0),
      line('m2', 'Fries', 40, 1),
    ]);
    const sale = await saleRepo.getById(saleId);
    expect(sale!.items).toHaveLength(1);
    expect(sale!.total).toBe(40);
  });

  it('throws EmptySaleError for an empty line list', async () => {
    await expect(saleRepo.completeSale([])).rejects.toBeInstanceOf(EmptySaleError);
  });

  it('throws EmptySaleError when every line has zero quantity', async () => {
    await expect(
      saleRepo.completeSale([line('m1', 'Water', 20, 0)])
    ).rejects.toBeInstanceOf(EmptySaleError);
  });
});

describe('saleRepo.dailyTotal', () => {
  it('sums totals and counts transactions for a given day', async () => {
    await saleRepo.completeSale([line('m1', 'Thing', 2, 2)]);
    await saleRepo.completeSale([line('m1', 'Thing', 2, 3)]);

    const today = await saleRepo.dailyTotal();
    expect(today.total).toBe(10);
    expect(today.count).toBe(2);
    expect(today.dateKey).toBe(dateKeyOf());
  });

  it('isolates totals by day', async () => {
    await saleRepo.completeSale([line('m1', 'Thing', 2, 1)]);

    await seedSale({
      id: newId(),
      timestamp: Date.now(),
      dateKey: '2000-01-01',
      items: [],
      total: 99,
      paymentType: PaymentType.CASH,
      businessId: 'local-business',
      updatedAt: Date.now(),
      isDeleted: false,
    });

    const today = await saleRepo.dailyTotal();
    expect(today.total).toBe(2);
    expect(today.count).toBe(1);

    const past = await saleRepo.dailyTotal('2000-01-01');
    expect(past.total).toBe(99);
    expect(past.count).toBe(1);
  });
});

describe('saleRepo void (soft delete)', () => {
  it('marks a sale voided with a timestamp and keeps the record', async () => {
    const id = await saleRepo.completeSale([line('m1', 'Thing', 50, 1)]);
    const before = Date.now();
    await saleRepo.voidSale(id);
    const sale = await saleRepo.getById(id);
    expect(sale).toBeDefined();
    expect(sale!.voided).toBe(true);
    expect(sale!.voidedAt).toBeGreaterThanOrEqual(before);
  });

  it('excludes voided sales from dailyTotal and count', async () => {
    await saleRepo.completeSale([line('m1', 'Keep', 30, 1)]);
    const oops = await saleRepo.completeSale([line('m2', 'Oops', 70, 1)]);

    let today = await saleRepo.dailyTotal();
    expect(today.total).toBe(100);
    expect(today.count).toBe(2);

    await saleRepo.voidSale(oops);

    today = await saleRepo.dailyTotal();
    expect(today.total).toBe(30);
    expect(today.count).toBe(1);
  });

  it('excludes voided sales from listByDate but keeps them in listAll', async () => {
    const a = await saleRepo.completeSale([line('m1', 'A', 10, 1)]);
    const b = await saleRepo.completeSale([line('m2', 'B', 20, 1)]);
    await saleRepo.voidSale(b);

    const active = await saleRepo.listByDate(dateKeyOf());
    expect(active.map((s) => s.id)).toEqual([a]);

    const all = await saleRepo.listAll();
    expect(all.map((s) => s.id).sort()).toEqual([a, b].sort());
  });

  it('listVoided returns only voided sales', async () => {
    await saleRepo.completeSale([line('m1', 'A', 10, 1)]);
    const b = await saleRepo.completeSale([line('m2', 'B', 20, 1)]);
    await saleRepo.voidSale(b);

    const voided = await saleRepo.listVoided();
    expect(voided).toHaveLength(1);
    expect(voided[0].id).toBe(b);
    expect(voided[0].voided).toBe(true);
  });
});
