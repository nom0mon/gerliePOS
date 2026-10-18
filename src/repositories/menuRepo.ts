import { getDb, newId } from '../db/rxdb';
import { MENU } from '../db/seed';
import { activeBusinessId } from '../config/tenancy';
import type { MenuItem, ModifierGroup } from '../types';

/**
 * Data access for menu items, now backed by RxDB (ADR 0001). Contexts/UI call
 * these functions instead of touching the database directly, keeping
 * persistence concerns isolated and testable. Public signatures are unchanged
 * except ids are strings (UUIDs) to match the cloud store.
 *
 * Soft-delete, tenancy stamping and the `updatedAt` conflict marker are
 * preserved: deletes set a `deleted` tombstone (so the deletion can replicate),
 * reads skip tombstones, and writes stamp businessId + updatedAt.
 */

export type NewMenuItem = {
  name: string;
  category: string;
  basePrice: number;
  modifierGroups?: ModifierGroup[];
  available?: boolean;
};

/** Insert a new menu item. Returns the new id. */
export async function add(input: NewMenuItem): Promise<string> {
  const db = await getDb();
  const id = newId();
  await db.menuitems.insert({
    id,
    name: input.name.trim(),
    category: input.category.trim(),
    basePrice: input.basePrice,
    available: input.available ?? true,
    modifierGroups: input.modifierGroups ?? [],
    businessId: activeBusinessId(),
    updatedAt: Date.now(),
    isDeleted: false,
  });
  return id;
}

/** List all (non-deleted) menu items ordered by category then name. */
export async function list(): Promise<MenuItem[]> {
  const db = await getDb();
  const docs = await db.menuitems.find().exec();
  return docs
    .map((d) => d.toJSON() as MenuItem)
    .filter((i) => !i.isDeleted)
    .sort(
      (a, b) =>
        a.category.localeCompare(b.category) || a.name.localeCompare(b.name)
    );
}

/** List only items available for sale (used on checkout). */
export async function listAvailable(): Promise<MenuItem[]> {
  return (await list()).filter((i) => i.available);
}

/** Fetch a single menu item by id, or undefined if it does not exist (or was deleted). */
export async function getById(id: string): Promise<MenuItem | undefined> {
  const db = await getDb();
  const doc = await db.menuitems.findOne(id).exec();
  if (!doc) return undefined;
  const item = doc.toJSON() as MenuItem;
  return item.isDeleted ? undefined : item;
}

/** Patch an existing menu item. Returns the number of records updated (0 or 1). */
export async function update(
  id: string,
  changes: Partial<Omit<MenuItem, 'id'>>
): Promise<number> {
  const db = await getDb();
  const doc = await db.menuitems.findOne(id).exec();
  if (!doc) return 0;
  await doc.patch({ ...changes, updatedAt: Date.now() });
  return 1;
}

/** Flip an item's availability (sold out / back in). Returns updated count. */
export async function setAvailable(
  id: string,
  available: boolean
): Promise<number> {
  return update(id, { available });
}

/**
 * Soft-delete a menu item: flag a `deleted` tombstone + bump `updatedAt` rather
 * than physically removing it, so the deletion replicates instead of the row
 * reappearing from another device. Reads skip tombstones.
 */
export async function remove(id: string): Promise<void> {
  const db = await getDb();
  const doc = await db.menuitems.findOne(id).exec();
  if (doc) await doc.patch({ isDeleted: true, updatedAt: Date.now() });
}

/**
 * Replace the entire menu with the default (JSON-sourced) menu. Clears existing
 * items first (hard removal is fine here — this is a deliberate local reset).
 * Returns the number of items seeded.
 */
export async function resetToDefault(): Promise<number> {
  const db = await getDb();
  await db.menuitems.find().remove();
  const now = Date.now();
  const businessId = activeBusinessId();
  await db.menuitems.bulkInsert(
    (MENU as MenuItem[]).map((item) => ({
      ...item,
      id: newId(),
      businessId,
      updatedAt: now,
      isDeleted: false,
    }))
  );
  return MENU.length;
}

export const menuRepo = {
  add,
  list,
  listAvailable,
  getById,
  update,
  setAvailable,
  remove,
  resetToDefault,
};
