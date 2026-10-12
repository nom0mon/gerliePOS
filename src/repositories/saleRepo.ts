import { db } from '../db/db';
import { PaymentType, type Sale, type SaleItem } from '../types';
import { dateKeyOf } from '../utils/date';

/** A single requested line in a sale: which product and how many units. */
export interface SaleLineInput {
  productId: number;
  quantity: number;
}

export class InsufficientStockError extends Error {
  constructor(public readonly productId: number, public readonly name: string) {
    super(`Insufficient stock for "${name}"`);
    this.name = 'InsufficientStockError';
  }
}

export class EmptySaleError extends Error {
  constructor() {
    super('Cannot complete a sale with no items.');
    this.name = 'EmptySaleError';
  }
}

/**
 * Complete a sale atomically. Inside a single readwrite transaction we:
 *   1. Re-read each product (authoritative stock, not the UI snapshot).
 *   2. Validate sufficient stock — throw to roll the whole transaction back.
 *   3. Build the sale record (snapshotting name + unit price per line).
 *   4. Decrement stockQuantity and increment salesCount on each product.
 *   5. Insert the sale.
 * Returns the new sale id.
 */
export async function completeSale(
  lines: SaleLineInput[],
  paymentType: PaymentType = PaymentType.CASH
): Promise<number> {
  if (lines.length === 0) throw new EmptySaleError();

  return db.transaction('rw', db.products, db.sales, async () => {
    const items: SaleItem[] = [];

    for (const { productId, quantity } of lines) {
      if (quantity <= 0) continue;
      const product = await db.products.get(productId);
      if (!product || product.id == null) {
        throw new InsufficientStockError(productId, `#${productId}`);
      }
      if (product.stockQuantity < quantity) {
        throw new InsufficientStockError(product.id, product.name);
      }

      items.push({
        productId: product.id,
        name: product.name,
        unitPrice: product.price,
        quantity,
        lineTotal: +(product.price * quantity).toFixed(2),
      });

      await db.products.update(product.id, {
        stockQuantity: product.stockQuantity - quantity,
        salesCount: product.salesCount + quantity,
      });
    }

    if (items.length === 0) throw new EmptySaleError();

    const now = new Date();
    const total = +items.reduce((sum, i) => sum + i.lineTotal, 0).toFixed(2);

    const sale: Sale = {
      timestamp: now.getTime(),
      dateKey: dateKeyOf(now),
      items,
      total,
      paymentType,
    };

    return db.sales.add(sale);
  });
}

/** Fetch a single sale by id (for the receipt view). */
export async function getById(id: number): Promise<Sale | undefined> {
  return db.sales.get(id);
}

/** All sales for a given day, newest first. */
export async function listByDate(dateKey: string): Promise<Sale[]> {
  const sales = await db.sales.where('dateKey').equals(dateKey).toArray();
  return sales.sort((a, b) => b.timestamp - a.timestamp);
}

export interface DailyTotal {
  dateKey: string;
  total: number;
  count: number;
}

/** Sum of sale totals and transaction count for a given day (default today). */
export async function dailyTotal(
  dateKey: string = dateKeyOf()
): Promise<DailyTotal> {
  const sales = await db.sales.where('dateKey').equals(dateKey).toArray();
  const total = +sales.reduce((sum, s) => sum + s.total, 0).toFixed(2);
  return { dateKey, total, count: sales.length };
}

export const saleRepo = {
  completeSale,
  getById,
  listByDate,
  dailyTotal,
};
