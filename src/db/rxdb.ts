import {
  createRxDatabase,
  addRxPlugin,
  type RxDatabase,
  type RxCollection,
  type RxJsonSchema,
} from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { RxDBQueryBuilderPlugin } from 'rxdb/plugins/query-builder';
import type { MenuItem, Sale } from '../types';

/**
 * RxDB is the single local store for the app (chosen in ADR 0001). It runs on
 * the Dexie (IndexedDB) RxStorage — the same browser storage the app already
 * used — and will replicate to Supabase per-business in Task 7.
 *
 * Dev-mode adds heavy runtime validation + logging; it must only run in dev
 * (ADR 0001 production note). We add it lazily so production bundles don't ship
 * the checks.
 */

let devModeAdded = false;
async function enableDevModeInDev() {
  // import.meta.env.DEV is true under Vite dev + Vitest, false in prod builds.
  if (import.meta.env.DEV && !devModeAdded) {
    const { RxDBDevModePlugin, disableWarnings } = await import(
      'rxdb/plugins/dev-mode'
    );
    addRxPlugin(RxDBDevModePlugin);
    disableWarnings(); // silence the premium/console nags in test output
    devModeAdded = true;
  }
}

addRxPlugin(RxDBQueryBuilderPlugin);

/** Shared document type helpers. */
export type MenuItemDoc = Required<Pick<MenuItem, 'id'>> & MenuItem;
export type SaleDoc = Required<Pick<Sale, 'id'>> & Sale;

export interface PosCollections {
  menuitems: RxCollection<MenuItem>;
  sales: RxCollection<Sale>;
}
export type PosRxDatabase = RxDatabase<PosCollections>;

// --- JSON schemas (RxDB requires a string primary key) ----------------------
const menuItemSchema: RxJsonSchema<MenuItem> = {
  title: 'menu item',
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 64 },
    name: { type: 'string' },
    category: { type: 'string' },
    basePrice: { type: 'number' },
    available: { type: 'boolean' },
    modifierGroups: { type: 'array', items: { type: 'object' } },
    trackStock: { type: 'boolean' },
    stockQty: { type: 'number' },
    lowStockThreshold: { type: 'number' },
    businessId: { type: 'string', maxLength: 64 },
    updatedAt: { type: 'number' },
    isDeleted: { type: 'boolean' },
  },
  required: ['id', 'name', 'category', 'basePrice', 'available'],
} as unknown as RxJsonSchema<MenuItem>;

const saleSchema: RxJsonSchema<Sale> = {
  title: 'sale',
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 64 },
    timestamp: { type: 'number' },
    dateKey: { type: 'string', maxLength: 10 },
    items: { type: 'array', items: { type: 'object' } },
    total: { type: 'number' },
    paymentType: { type: 'string' },
    voided: { type: 'boolean' },
    voidedAt: { type: 'number' },
    businessId: { type: 'string', maxLength: 64 },
    updatedAt: { type: 'number' },
    isDeleted: { type: 'boolean' },
  },
  required: ['id', 'timestamp', 'dateKey', 'total', 'paymentType'],
} as unknown as RxJsonSchema<Sale>;

let dbPromise: Promise<PosRxDatabase> | null = null;

/**
 * Get (creating once) the shared RxDB database. Idempotent — all callers await
 * the same promise, so there is a single database instance per tab.
 */
export function getDb(): Promise<PosRxDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      await enableDevModeInDev();
      const db = await createRxDatabase<PosCollections>({
        name: 'kaffeed_rxdb',
        storage: getRxStorageDexie(),
        // Allows a fresh page load to reuse an existing instance in dev/HMR.
        ignoreDuplicate: import.meta.env.DEV,
        eventReduce: true,
      });
      await db.addCollections({
        menuitems: { schema: menuItemSchema },
        sales: { schema: saleSchema },
      });
      return db;
    })();
  }
  return dbPromise;
}

/** Generate a UUID for new rows (matches Postgres uuid pk shape). */
export function newId(): string {
  // crypto.randomUUID is available in modern browsers and Node 16+.
  return crypto.randomUUID();
}

/**
 * Test/maintenance helper: wipe all documents from both collections. Used by
 * the test suites' reset step (replaces the old `db.*.clear()` calls).
 */
export async function clearAll(): Promise<void> {
  const db = await getDb();
  await db.menuitems.find().remove();
  await db.sales.find().remove();
}
