import { describe, it, expect, beforeEach } from 'vitest';
import { importLegacyDexieData } from './importLegacy';
import { resetStore } from '../test/storeTestUtils';
import { menuRepo } from '../repositories/menuRepo';
import { saleRepo } from '../repositories/saleRepo';

const DONE_FLAG = 'kaffeed-rxdb-import-done';
const LEGACY_DB = 'kaffeed-pos';

function deleteLegacy(): Promise<void> {
  return new Promise((resolve) => {
    const req = indexedDB.deleteDatabase(LEGACY_DB);
    req.onsuccess = req.onerror = req.onblocked = () => resolve();
  });
}

/**
 * Build a legacy 'kaffeed-pos' IndexedDB with the old numeric-id shape using the
 * raw IndexedDB API (no Dexie — avoids the "two Dexie versions" conflict).
 * Returns the numeric id assigned to the seeded menu item.
 */
function makeLegacyDb(): Promise<number> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open(LEGACY_DB, 4);
    open.onupgradeneeded = () => {
      const db = open.result;
      db.createObjectStore('menuItems', { keyPath: 'id', autoIncrement: true });
      db.createObjectStore('sales', { keyPath: 'id', autoIncrement: true });
    };
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result;
      const tx = db.transaction(['menuItems', 'sales'], 'readwrite');
      const items = tx.objectStore('menuItems');
      const addReq = items.add({
        name: 'Legacy Coffee',
        category: 'Drinks',
        basePrice: 50,
        available: true,
        modifierGroups: [],
        businessId: 'local-business',
        updatedAt: Date.now(),
        deleted: false,
      });
      addReq.onsuccess = () => {
        const coffeeId = addReq.result as number;
        tx.objectStore('sales').add({
          timestamp: Date.now(),
          dateKey: '2026-02-02',
          total: 100,
          paymentType: 'CASH',
          items: [
            {
              menuItemId: coffeeId,
              name: 'Legacy Coffee',
              basePrice: 50,
              selectedModifiers: [],
              unitPrice: 50,
              quantity: 2,
              lineTotal: 100,
            },
          ],
          businessId: 'local-business',
          updatedAt: Date.now(),
          deleted: false,
        });
        tx.oncomplete = () => {
          db.close();
          resolve(coffeeId);
        };
      };
    };
  });
}

beforeEach(async () => {
  await resetStore();
  localStorage.removeItem(DONE_FLAG);
  await deleteLegacy();
});

describe('legacy Dexie → RxDB import', () => {
  it('migrates menu items and sales, assigning UUIDs and remapping sale lines', async () => {
    const legacyCoffeeId = await makeLegacyDb();

    const result = await importLegacyDexieData();
    expect(result).toEqual({ menuItems: 1, sales: 1 });

    const items = await menuRepo.list();
    expect(items).toHaveLength(1);
    const coffee = items[0];
    expect(coffee.name).toBe('Legacy Coffee');
    expect(typeof coffee.id).toBe('string');
    expect(coffee.id).not.toBe(String(legacyCoffeeId));

    const sales = await saleRepo.listAll();
    expect(sales).toHaveLength(1);
    expect(sales[0].total).toBe(100);
    expect(sales[0].items[0].menuItemId).toBe(coffee.id);
    expect(typeof sales[0].id).toBe('string');
  });

  it('is idempotent: a second run does not duplicate data', async () => {
    await makeLegacyDb();
    await importLegacyDexieData();
    const second = await importLegacyDexieData();
    expect(second).toBeNull();
    expect(await menuRepo.list()).toHaveLength(1);
  });

  it('no-ops when there is no legacy database', async () => {
    const result = await importLegacyDexieData();
    expect(result).toBeNull();
    expect(await menuRepo.list()).toHaveLength(0);
  });
});
