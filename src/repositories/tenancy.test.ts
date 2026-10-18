import { describe, it, expect, beforeEach } from 'vitest';
import { menuRepo } from './menuRepo';
import { saleRepo } from './saleRepo';
import { getDb } from '../db/rxdb';
import { resetStore } from '../test/storeTestUtils';
import { LOCAL_BUSINESS_ID } from '../config/tenancy';
import { PaymentType } from '../types';

async function rawMenuItem(id: string) {
  const db = await getDb();
  const doc = await db.menuitems.findOne(id).exec();
  return doc ? doc.toJSON() : undefined;
}
async function rawSale(id: string) {
  const db = await getDb();
  const doc = await db.sales.findOne(id).exec();
  return doc ? doc.toJSON() : undefined;
}

beforeEach(async () => {
  await resetStore();
});

describe('tenancy + sync metadata (Phase 1 foundation)', () => {
  it('stamps businessId, updatedAt and deleted=false on new menu items', async () => {
    const before = Date.now();
    const id = await menuRepo.add({ name: 'Latte', category: 'Drinks', basePrice: 60 });
    const raw = await rawMenuItem(id);
    expect(raw?.businessId).toBe(LOCAL_BUSINESS_ID);
    expect(raw?.isDeleted).toBe(false);
    expect(raw?.updatedAt).toBeGreaterThanOrEqual(before);
  });

  it('bumps updatedAt on update and setAvailable', async () => {
    const id = await menuRepo.add({ name: 'Fries', category: 'Snacks', basePrice: 40 });
    const t1 = (await rawMenuItem(id))!.updatedAt!;
    await new Promise((r) => setTimeout(r, 2));
    await menuRepo.update(id, { basePrice: 45 });
    const t2 = (await rawMenuItem(id))!.updatedAt!;
    expect(t2).toBeGreaterThan(t1);

    await new Promise((r) => setTimeout(r, 2));
    await menuRepo.setAvailable(id, false);
    const t3 = (await rawMenuItem(id))!.updatedAt!;
    expect(t3).toBeGreaterThan(t2);
  });

  it('remove is a soft-delete tombstone: hidden from reads but kept as a row', async () => {
    const id = await menuRepo.add({ name: 'Gone', category: 'X', basePrice: 1 });
    await menuRepo.remove(id);

    expect(await menuRepo.getById(id)).toBeUndefined();
    expect((await menuRepo.list()).some((i) => i.id === id)).toBe(false);
    expect((await menuRepo.listAvailable()).some((i) => i.id === id)).toBe(false);

    const raw = await rawMenuItem(id);
    expect(raw).toBeDefined();
    expect(raw?.isDeleted).toBe(true);
    expect(raw?.updatedAt).toBeGreaterThan(0);
  });

  it('stamps tenancy + sync metadata on completed sales', async () => {
    const saleId = await saleRepo.completeSale(
      [{ menuItemId: 'm1', name: 'Latte', basePrice: 60, selectedModifiers: [], unitPrice: 60, quantity: 1 }],
      PaymentType.CASH
    );
    const raw = await rawSale(saleId);
    expect(raw?.businessId).toBe(LOCAL_BUSINESS_ID);
    expect(raw?.isDeleted).toBe(false);
    expect(raw?.updatedAt).toBeGreaterThan(0);
  });

  it('voiding a sale bumps updatedAt (so the void syncs under last-write-wins)', async () => {
    const saleId = await saleRepo.completeSale(
      [{ menuItemId: 'm1', name: 'Latte', basePrice: 60, selectedModifiers: [], unitPrice: 60, quantity: 1 }],
      PaymentType.CASH
    );
    const t1 = (await rawSale(saleId))!.updatedAt!;
    await new Promise((r) => setTimeout(r, 2));
    await saleRepo.voidSale(saleId);
    const voided = (await rawSale(saleId))!;
    expect(voided.voided).toBe(true);
    expect(voided.updatedAt).toBeGreaterThan(t1);
  });
});
