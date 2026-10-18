import { getDb } from '../db/rxdb';
import type { MenuItem } from '../types';

/**
 * Simple, opt-in stock tracking for menu items (RxDB-backed). Stock lives on
 * the MenuItem document (fields `trackStock`, `stockQty`, `lowStockThreshold`).
 *
 * All data access goes through this repo, matching menuRepo/saleRepo.
 */

/** Human-readable stock state for an item, derived from its fields. */
export type StockStatus = 'untracked' | 'out' | 'low' | 'ok';

/**
 * Pure classifier — exported so the rules are unit-testable without a database.
 */
export function stockStatus(item: MenuItem): StockStatus {
  if (!item.trackStock) return 'untracked';
  const qty = item.stockQty ?? 0;
  if (qty <= 0) return 'out';
  const threshold = item.lowStockThreshold ?? 0;
  if (qty <= threshold) return 'low';
  return 'ok';
}

/**
 * Whether an item can currently be sold on checkout: available AND (untracked
 * OR has stock left). Collapses "tracked and out of stock" into sold-out.
 */
export function isSellable(item: MenuItem): boolean {
  if (!item.available) return false;
  return stockStatus(item) !== 'out';
}

/**
 * Enable/disable tracking and set opening quantity + optional threshold.
 * Clamps negatives to 0. Returns rows updated (0/1).
 */
export async function configure(
  id: string,
  opts: { trackStock: boolean; stockQty?: number; lowStockThreshold?: number }
): Promise<number> {
  const db = await getDb();
  const doc = await db.menuitems.findOne(id).exec();
  if (!doc) return 0;
  const changes: Partial<MenuItem> = {
    trackStock: opts.trackStock,
    updatedAt: Date.now(),
  };
  if (opts.trackStock) {
    changes.stockQty = Math.max(0, Math.floor(opts.stockQty ?? 0));
    changes.lowStockThreshold = Math.max(
      0,
      Math.floor(opts.lowStockThreshold ?? 0)
    );
  }
  await doc.patch(changes);
  return 1;
}

/**
 * Set an absolute quantity for a tracked item. No-op (0) if untracked/missing.
 */
export async function setQuantity(id: string, qty: number): Promise<number> {
  const db = await getDb();
  const doc = await db.menuitems.findOne(id).exec();
  if (!doc || !doc.get('trackStock')) return 0;
  await doc.patch({ stockQty: Math.max(0, Math.floor(qty)), updatedAt: Date.now() });
  return 1;
}

/**
 * Adjust a tracked item's quantity by a delta, clamped at 0. Returns the new
 * quantity, or null if the item is untracked/missing.
 */
export async function adjustQuantity(
  id: string,
  delta: number
): Promise<number | null> {
  const db = await getDb();
  const doc = await db.menuitems.findOne(id).exec();
  if (!doc || !doc.get('trackStock')) return null;
  const next = Math.max(0, (doc.get('stockQty') ?? 0) + delta);
  await doc.patch({ stockQty: next, updatedAt: Date.now() });
  return next;
}

/**
 * Apply the stock effect of sold lines: for each distinct tracked menu item,
 * change quantity by sign*soldQty (sign -1 to deduct on sale, +1 to restore on
 * void). Combines multiple lines of the same item.
 *
 * Note: RxDB has no cross-collection transaction like Dexie, so this is applied
 * sequentially by the caller right after the sale write. For a single-device
 * POS doing one sale at a time this is safe; true multi-writer atomicity is a
 * cloud/sync concern handled by last-write-wins in Task 7.
 */
export async function applySaleDelta(
  lines: { menuItemId: string; quantity: number }[],
  sign: 1 | -1
): Promise<void> {
  const perItem = new Map<string, number>();
  for (const l of lines) {
    perItem.set(l.menuItemId, (perItem.get(l.menuItemId) ?? 0) + l.quantity);
  }
  const db = await getDb();
  const now = Date.now();
  for (const [menuItemId, qty] of perItem) {
    const doc = await db.menuitems.findOne(menuItemId).exec();
    if (!doc || !doc.get('trackStock')) continue;
    const next = Math.max(0, (doc.get('stockQty') ?? 0) + sign * qty);
    await doc.patch({ stockQty: next, updatedAt: now });
  }
}

export const stockRepo = {
  stockStatus,
  isSellable,
  configure,
  setQuantity,
  adjustQuantity,
  applySaleDelta,
};
