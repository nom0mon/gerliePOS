import { getDb, newId } from '../db/rxdb';
import { PaymentType, type Sale, type SaleItem } from '../types';
import { activeBusinessId } from '../config/tenancy';
import { applySaleDelta } from './stockRepo';
import { dateKeyOf } from '../utils/date';

/**
 * Sale data access, RxDB-backed. Public signatures unchanged except ids are
 * strings (UUIDs). Soft-delete semantics for sales stay as the `voided` flag
 * (kept for the audit trail); `deleted` tombstone is set false on creation.
 */

export type SaleLineInput = Omit<SaleItem, 'lineTotal'>;

export class EmptySaleError extends Error {
  constructor() {
    super('Cannot complete a sale with no items.');
    this.name = 'EmptySaleError';
  }
}

/**
 * Complete a sale: snapshot the lines, compute totals, insert one sale, and
 * decrement stock for any tracked items. (RxDB has no multi-collection
 * transaction; the stock delta is applied right after the insert — safe for a
 * single-device POS doing one sale at a time.) Returns the new sale id.
 */
export async function completeSale(
  lines: SaleLineInput[],
  paymentType: PaymentType = PaymentType.CASH
): Promise<string> {
  const valid = lines.filter((l) => l.quantity > 0);
  if (valid.length === 0) throw new EmptySaleError();

  const items: SaleItem[] = valid.map((l) => ({
    ...l,
    lineTotal: +(l.unitPrice * l.quantity).toFixed(2),
  }));
  const now = new Date();
  const total = +items.reduce((sum, i) => sum + i.lineTotal, 0).toFixed(2);
  const id = newId();

  const db = await getDb();
  await db.sales.insert({
    id,
    timestamp: now.getTime(),
    dateKey: dateKeyOf(now),
    items,
    total,
    paymentType,
    businessId: activeBusinessId(),
    updatedAt: now.getTime(),
    isDeleted: false,
  });
  await applySaleDelta(items, -1);
  return id;
}

/** Fetch a single sale by id (for the receipt view). */
export async function getById(id: string): Promise<Sale | undefined> {
  const db = await getDb();
  const doc = await db.sales.findOne(id).exec();
  return doc ? (doc.toJSON() as Sale) : undefined;
}

/**
 * Void a sale (soft delete). Kept for the audit trail, excluded from totals.
 * Restores tracked stock exactly once (a second void is a no-op). Returns the
 * number of records updated (0/1).
 */
export async function voidSale(id: string): Promise<number> {
  const db = await getDb();
  const doc = await db.sales.findOne(id).exec();
  if (!doc || doc.get('voided')) return 0;
  const now = Date.now();
  await applySaleDelta(doc.get('items') as SaleItem[], +1);
  await doc.patch({ voided: true, voidedAt: now, updatedAt: now });
  return 1;
}

async function allSales(): Promise<Sale[]> {
  const db = await getDb();
  const docs = await db.sales.find().exec();
  return docs.map((d) => d.toJSON() as Sale);
}

/** Every sale, newest first — active and voided (for the admin panel). */
export async function listAll(): Promise<Sale[]> {
  return (await allSales()).sort((a, b) => b.timestamp - a.timestamp);
}

/** Only voided sales, most recently voided first (for the audit view). */
export async function listVoided(): Promise<Sale[]> {
  return (await allSales())
    .filter((s) => s.voided === true)
    .sort((a, b) => (b.voidedAt ?? 0) - (a.voidedAt ?? 0));
}

/** Active (non-voided) sales for a given day, newest first. */
export async function listByDate(dateKey: string): Promise<Sale[]> {
  return (await allSales())
    .filter((s) => s.dateKey === dateKey && !s.voided)
    .sort((a, b) => b.timestamp - a.timestamp);
}

export interface DailyTotal {
  dateKey: string;
  total: number;
  count: number;
}

/**
 * Sum of sale totals and transaction count for a given day (default today).
 * Voided sales are excluded.
 */
export async function dailyTotal(
  dateKey: string = dateKeyOf()
): Promise<DailyTotal> {
  const active = (await allSales()).filter(
    (s) => s.dateKey === dateKey && !s.voided
  );
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
