import { getDb, newId } from './rxdb';
import { LOCAL_BUSINESS_ID } from '../config/tenancy';
import type { MenuItem, Sale, SaleItem } from '../types';

/**
 * One-time migration of existing on-device data from the legacy Dexie database
 * (`kaffeed-pos`, used before the RxDB switch in ADR 0001) into RxDB.
 *
 * Existing installs already hold a vendor's menu and sales in the old Dexie
 * store; switching stores must not lose that data. This copies every row across,
 * assigning string UUIDs (the old store used numeric auto-increment ids) and
 * remapping each sale line's `menuItemId` from the old numeric id to the new
 * UUID so receipts/stock still line up. The old `deleted` field maps to RxDB's
 * `isDeleted`.
 *
 * Implementation note: we read the legacy DB with the raw IndexedDB API rather
 * than Dexie. RxDB's Dexie storage bundles its own Dexie copy, and loading a
 * second Dexie instance in the same app throws ("Two different versions of
 * Dexie"). Raw IndexedDB avoids that entirely and needs no extra dependency.
 *
 * Idempotent: guarded by a localStorage flag and a check that RxDB is empty.
 */

const DONE_FLAG = 'kaffeed-rxdb-import-done';
const LEGACY_DB = 'kaffeed-pos';

interface LegacyMenuItem {
  id: number;
  name: string;
  category: string;
  basePrice: number;
  available: boolean;
  modifierGroups: MenuItem['modifierGroups'];
  trackStock?: boolean;
  stockQty?: number;
  lowStockThreshold?: number;
  businessId?: string;
  updatedAt?: number;
  deleted?: boolean;
}
interface LegacySaleItem extends Omit<SaleItem, 'menuItemId'> {
  menuItemId: number;
}
interface LegacySale {
  id: number;
  timestamp: number;
  dateKey: string;
  items: LegacySaleItem[];
  total: number;
  paymentType: Sale['paymentType'];
  voided?: boolean;
  voidedAt?: number;
  businessId?: string;
  updatedAt?: number;
  deleted?: boolean;
}

/** Promisified check for whether an IndexedDB database exists (and has stores). */
function openLegacy(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    // Opening without a version uses the existing version; onupgradeneeded only
    // fires if the DB does not exist (version 1 created empty) — we detect that
    // and treat it as "no legacy data".
    const req = indexedDB.open(LEGACY_DB);
    let createdFresh = false;
    req.onupgradeneeded = () => {
      createdFresh = true; // DB didn't exist before
    };
    req.onsuccess = () => {
      const db = req.result;
      if (createdFresh || !db.objectStoreNames.contains('menuItems')) {
        db.close();
        resolve(null);
        return;
      }
      resolve(db);
    };
    req.onerror = () => resolve(null);
  });
}

function readAll<T>(db: IDBDatabase, store: string): Promise<T[]> {
  return new Promise((resolve) => {
    if (!db.objectStoreNames.contains(store)) return resolve([]);
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve((req.result as T[]) ?? []);
    req.onerror = () => resolve([]);
  });
}

export async function importLegacyDexieData(): Promise<{
  menuItems: number;
  sales: number;
} | null> {
  if (localStorage.getItem(DONE_FLAG) === 'true') return null;

  const rx = await getDb();
  // Only import into an empty RxDB, so we never clobber newer data.
  if ((await rx.menuitems.count().exec()) > 0) {
    localStorage.setItem(DONE_FLAG, 'true');
    return null;
  }

  const legacy = await openLegacy();
  if (!legacy) {
    localStorage.setItem(DONE_FLAG, 'true');
    return null;
  }

  const now = Date.now();
  const businessId = LOCAL_BUSINESS_ID;

  const oldItems = await readAll<LegacyMenuItem>(legacy, 'menuItems');
  const oldSales = await readAll<LegacySale>(legacy, 'sales');
  legacy.close();

  const idMap = new Map<number, string>();
  const newItems: MenuItem[] = oldItems.map((it) => {
    const id = newId();
    idMap.set(it.id, id);
    const { id: _oldId, deleted: _legacyDeleted, ...rest } = it;
    return {
      ...(rest as Omit<MenuItem, 'id' | 'isDeleted'>),
      id,
      businessId: it.businessId ?? businessId,
      updatedAt: it.updatedAt ?? now,
      isDeleted: it.deleted ?? false,
    };
  });

  const newSales: Sale[] = oldSales.map((s) => {
    const { id: _oldId, items, deleted: _legacyDeleted, ...rest } = s;
    const remappedItems: SaleItem[] = items.map((li) => ({
      ...li,
      menuItemId: idMap.get(li.menuItemId) ?? String(li.menuItemId),
    }));
    return {
      ...(rest as Omit<Sale, 'id' | 'items' | 'isDeleted'>),
      id: newId(),
      items: remappedItems,
      businessId: s.businessId ?? businessId,
      updatedAt: s.updatedAt ?? s.timestamp ?? now,
      isDeleted: s.deleted ?? false,
    };
  });

  if (newItems.length) await rx.menuitems.bulkInsert(newItems);
  if (newSales.length) await rx.sales.bulkInsert(newSales);

  localStorage.setItem(DONE_FLAG, 'true');
  return { menuItems: newItems.length, sales: newSales.length };
}
