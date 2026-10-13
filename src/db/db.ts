import Dexie, { type Table } from 'dexie';
import type { MenuItem, Sale } from '../types';

/**
 * Single Dexie instance for the whole app (Dexie best practice: declare once,
 * export the instance, import it wherever data access is needed).
 *
 * Schema versioning: bump the version number and add a new `.version(n).stores(...)`
 * block (plus an optional `.upgrade()`) when the schema changes. Never edit an
 * existing version block once it has shipped to a device.
 *
 * v1 modelled a grocery catalog (`products` with stock). v2 reshapes the app
 * into a street-food menu (`menuItems`, no stock). The v1 `products` store is
 * dropped by setting it to `null` in the v2 block.
 */
export class PosDatabase extends Dexie {
  menuItems!: Table<MenuItem, number>;
  sales!: Table<Sale, number>;

  constructor() {
    super('kaffeed-pos');

    // v1 (legacy grocery schema) — kept so upgrades from existing installs work.
    this.version(1).stores({
      products: '++id, name',
      sales: '++id, dateKey, timestamp',
    });

    // v2 — street-food menu. Only indexed fields are listed; non-indexed fields
    // (basePrice, available, modifierGroups, items, total, paymentType) are
    // still stored, just not indexed. `products: null` drops the old store.
    this.version(2).stores({
      products: null,
      menuItems: '++id, name, category',
      sales: '++id, dateKey, timestamp',
    });

    // v3 — adds `voided` so accidental sales can be soft-deleted (kept for the
    // audit trail, excluded from totals). Indexing `voided` lets the audit view
    // query voided sales directly. Additive: existing sales simply have no
    // `voided` value (treated as active). No data migration required.
    this.version(3).stores({
      menuItems: '++id, name, category',
      sales: '++id, dateKey, timestamp, voided',
    });
  }
}

export const db = new PosDatabase();
