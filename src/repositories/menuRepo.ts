import { db } from '../db/db';
import { MENU } from '../db/seed';
import type { MenuItem, ModifierGroup } from '../types';

/**
 * Data access for menu items. Contexts/UI call these functions instead of
 * touching Dexie directly, keeping persistence concerns isolated and testable.
 *
 * There is no inventory tracking for a street-food stall: the only availability
 * control is the `available` flag (shown / hidden on checkout).
 */

export type NewMenuItem = {
  name: string;
  category: string;
  basePrice: number;
  modifierGroups?: ModifierGroup[];
  available?: boolean;
};

/** Insert a new menu item. Returns the new id. */
export async function add(input: NewMenuItem): Promise<number> {
  const item: MenuItem = {
    name: input.name.trim(),
    category: input.category.trim(),
    basePrice: input.basePrice,
    available: input.available ?? true,
    modifierGroups: input.modifierGroups ?? [],
  };
  return db.menuItems.add(item);
}

/** List all menu items ordered by category then name. */
export async function list(): Promise<MenuItem[]> {
  const items = await db.menuItems.toArray();
  return items.sort(
    (a, b) =>
      a.category.localeCompare(b.category) || a.name.localeCompare(b.name)
  );
}

/** List only items available for sale (used on checkout). */
export async function listAvailable(): Promise<MenuItem[]> {
  return (await list()).filter((i) => i.available);
}

/** Fetch a single menu item by id, or undefined if it does not exist. */
export async function getById(id: number): Promise<MenuItem | undefined> {
  return db.menuItems.get(id);
}

/** Patch an existing menu item. Returns the number of records updated (0 or 1). */
export async function update(
  id: number,
  changes: Partial<Omit<MenuItem, 'id'>>
): Promise<number> {
  return db.menuItems.update(id, changes);
}

/** Flip an item's availability (sold out / back in). Returns updated count. */
export async function setAvailable(
  id: number,
  available: boolean
): Promise<number> {
  return db.menuItems.update(id, { available });
}

/** Delete a menu item permanently. */
export async function remove(id: number): Promise<void> {
  await db.menuItems.delete(id);
}

/**
 * Replace the entire menu with the default (JSON-sourced) menu. Clears all
 * existing items first, so this discards any manual edits. Used by the admin
 * "Reset menu to default" action — e.g. to refresh a device that still has the
 * old sample menu. Returns the number of items seeded.
 */
export async function resetToDefault(): Promise<number> {
  return db.transaction('rw', db.menuItems, async () => {
    await db.menuItems.clear();
    await db.menuItems.bulkAdd(MENU as MenuItem[]);
    return MENU.length;
  });
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
