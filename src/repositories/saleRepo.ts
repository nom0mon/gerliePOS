import { db } from '../db/db';
import { PaymentType, type Sale, type SaleItem } from '../types';
import { dateKeyOf } from '../utils/date';

/**
 * A fully-resolved sale line as sent from the cart. Modifiers are chosen in the
 * UI, so the line already carries its snapshotted name, base price, selected
 * modifiers and computed unit price. The repo trusts and persists these.
 */
export type SaleLineInput = Omit<SaleItem, 'lineTotal'>;

export class EmptySaleError extends Error {
  constructor() {
    super('Cannot complete a sale with no items.');
    this.name = 'EmptySaleError';
  }
}

/**
 * Complete a sale atomically. There is no inventory to adjust (street food is
 * not stock-tracked), so this simply snapshots the lines, computes totals and
 * inserts one sale record inside a transaction. Returns the new sale id.
 */
export async function completeSale(
  lines: SaleLineInput[],
  paymentType: PaymentType = PaymentType.CASH
): Promise<number> {
  const valid = lines.filter((l) => l.quantity > 0);
  if (valid.length === 0) throw new EmptySaleError();

  const items: SaleItem[] = valid.map((l) => ({
    ...l,
    lineTotal: +(l.unitPrice * l.quantity).toFixed(2),
  }));

  const now = new Date();
  const total = +items.reduce((sum, i) => sum + i.lineTotal, 0).toFixed(2);

  const sale: Sale = {
    timestamp: now.getTime(),
    dateKey: dateKeyOf(now),
    items,
    total,
    paymentType,
  };

  return db.transaction('rw', db.sales, async () => db.sales.add(sale));
}

/** Fetch a single sale by id (for the receipt view). */
export async function getById(id: number): Promise<Sale | undefined> {
  return db.sales.get(id);
}

/**
 * Void a sale (soft delete). The record is kept for the audit trail but is
 * excluded from reporting totals. Returns the number of records updated (0/1).
 */
export async function voidSale(id: number): Promise<number> {
  return db.sales.update(id, { voided: true, voidedAt: Date.now() });
}

/** Every sale, newest first — active and voided (for the admin panel). */
export async function listAll(): Promise<Sale[]> {
  const sales = await db.sales.toArray();
  return sales.sort((a, b) => b.timestamp - a.timestamp);
}

/** Only voided sales, most recently voided first (for the audit view). */
export async function listVoided(): Promise<Sale[]> {
  const sales = await db.sales.filter((s) => s.voided === true).toArray();
  return sales.sort((a, b) => (b.voidedAt ?? 0) - (a.voidedAt ?? 0));
}

/** Active (non-voided) sales for a given day, newest first. */
export async function listByDate(dateKey: string): Promise<Sale[]> {
  const sales = await db.sales.where('dateKey').equals(dateKey).toArray();
  return sales
    .filter((s) => !s.voided)
    .sort((a, b) => b.timestamp - a.timestamp);
}

export interface DailyTotal {
  dateKey: string;
  total: number;
  count: number;
}

/**
 * Sum of sale totals and transaction count for a given day (default today).
 * Voided sales are excluded so an accidental transaction never inflates the
 * day's figures.
 */
export async function dailyTotal(
  dateKey: string = dateKeyOf()
): Promise<DailyTotal> {
  const sales = await db.sales.where('dateKey').equals(dateKey).toArray();
  const active = sales.filter((s) => !s.voided);
  const total = +active.reduce((sum, s) => sum + s.total, 0).toFixed(2);
  return { dateKey, total, count: active.length };
}

export const saleRepo = {
  completeSale,
  getById,
  voidSale,
  listAll,
  listVoided,
  listByDate,
  dailyTotal,
};
