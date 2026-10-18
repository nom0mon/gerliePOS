import { getDb } from '../db/rxdb';
import { menuRepo } from '../repositories/menuRepo';
import type { MenuItem, Sale } from '../types';

/**
 * Test helpers for the RxDB-backed store. Tests must not touch the database
 * directly; these go through the same store the app uses.
 */

/** Remove all documents from both collections (replaces old db.*.clear()). */
export async function resetStore(): Promise<void> {
  const db = await getDb();
  await db.menuitems.find().remove();
  await db.sales.find().remove();
}

/** Insert a menu item for a test and return its new string id. */
export async function seedMenuItem(
  input: Partial<MenuItem> & { name: string; category: string; basePrice: number }
): Promise<string> {
  return menuRepo.add({
    name: input.name,
    category: input.category,
    basePrice: input.basePrice,
    available: input.available,
    modifierGroups: input.modifierGroups,
  });
}

/** Insert a raw sale document (for report/receipt tests). Returns its id. */
export async function seedSale(sale: Sale): Promise<string> {
  const db = await getDb();
  const doc = await db.sales.insert(sale);
  return doc.get('id');
}

/** Count helpers used by assertions that previously called db.sales.count(). */
export async function salesCount(): Promise<number> {
  const db = await getDb();
  return db.sales.count().exec();
}
