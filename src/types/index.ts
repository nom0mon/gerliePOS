/**
 * Shared domain types for the POS app.
 * Kept framework-agnostic so repositories, contexts, and UI all agree on shape.
 */

/**
 * Supported payment methods. v1 only supports CASH, but this is modeled as an
 * enum so additional types (CARD, MOBILE, ...) can be added without a schema
 * rewrite — sales already carry a paymentType field.
 */
export enum PaymentType {
  CASH = 'CASH',
}

export interface Product {
  /** Auto-incremented primary key assigned by Dexie. Absent before insert. */
  id?: number;
  name: string;
  /** Unit price in the store's currency (plain number, e.g. 9.99). */
  price: number;
  /** Units currently in stock. Decremented on sale. */
  stockQuantity: number;
  /** Cumulative units sold across all sales. Incremented on sale. */
  salesCount: number;
}

/**
 * A line item captured at the moment of sale. Product name and unit price are
 * snapshotted so a receipt stays accurate even if the product is edited later.
 */
export interface SaleItem {
  productId: number;
  name: string;
  unitPrice: number;
  quantity: number;
  /** unitPrice * quantity, stored for convenience/reporting. */
  lineTotal: number;
}

export interface Sale {
  id?: number;
  /** Epoch milliseconds when the sale completed. */
  timestamp: number;
  /** ISO date (YYYY-MM-DD) in local time, indexed for daily reporting. */
  dateKey: string;
  items: SaleItem[];
  /** Sum of all line totals. */
  total: number;
  paymentType: PaymentType;
}
