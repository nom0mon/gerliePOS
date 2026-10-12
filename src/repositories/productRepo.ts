import { db } from '../db/db';
import type { Product } from '../types';

/**
 * Data access for products. Contexts/UI call these functions instead of
 * touching Dexie directly, keeping persistence concerns isolated and testable.
 */

export type NewProduct = {
  name: string;
  price: number;
  stockQuantity: number;
};

/** Insert a new product. salesCount always starts at 0. Returns the new id. */
export async function add(input: NewProduct): Promise<number> {
  const product: Product = {
    name: input.name.trim(),
    price: input.price,
    stockQuantity: input.stockQuantity,
    salesCount: 0,
  };
  return db.products.add(product);
}

/** List all products ordered by name (case-insensitive by Dexie's name index). */
export async function list(): Promise<Product[]> {
  return db.products.orderBy('name').toArray();
}

/** Fetch a single product by id, or undefined if it does not exist. */
export async function getById(id: number): Promise<Product | undefined> {
  return db.products.get(id);
}

/** Patch an existing product. Returns the number of records updated (0 or 1). */
export async function update(
  id: number,
  changes: Partial<Omit<Product, 'id'>>
): Promise<number> {
  return db.products.update(id, changes);
}

export const productRepo = { add, list, getById, update };
