import { db } from './db';
import type { Product } from '../types';

const SAMPLE_PRODUCTS: Omit<Product, 'id'>[] = [
  { name: 'Bottled Water', price: 1.0, stockQuantity: 50, salesCount: 0 },
  { name: 'Chips', price: 2.5, stockQuantity: 30, salesCount: 0 },
  { name: 'Chocolate Bar', price: 1.75, stockQuantity: 40, salesCount: 0 },
  { name: 'Coffee', price: 3.25, stockQuantity: 20, salesCount: 0 },
  { name: 'Sandwich', price: 5.0, stockQuantity: 15, salesCount: 0 },
];

/**
 * Populate sample products if (and only if) the catalog is currently empty.
 * Safe to call on every app start. Returns the number of products inserted.
 */
export async function seedIfEmpty(): Promise<number> {
  const count = await db.products.count();
  if (count > 0) return 0;
  await db.products.bulkAdd(SAMPLE_PRODUCTS as Product[]);
  return SAMPLE_PRODUCTS.length;
}
