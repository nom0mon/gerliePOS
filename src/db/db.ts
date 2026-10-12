import Dexie, { type Table } from 'dexie';
import type { Product, Sale } from '../types';

/**
 * Single Dexie instance for the whole app (Dexie best practice: declare once,
 * export the instance, import it wherever data access is needed).
 *
 * Schema versioning: bump the version number and add a new `.version(n).stores(...)`
 * block (plus an optional `.upgrade()`) when the schema changes. Never edit an
 * existing version block once it has shipped to a device.
 */
export class PosDatabase extends Dexie {
  products!: Table<Product, number>;
  sales!: Table<Sale, number>;

  constructor() {
    super('mommy-pos');

    // Only indexed fields are listed. Non-indexed fields (price, stockQuantity,
    // salesCount, items, total, paymentType) are still stored, just not indexed.
    this.version(1).stores({
      products: '++id, name',
      sales: '++id, dateKey, timestamp',
    });
  }
}

export const db = new PosDatabase();
