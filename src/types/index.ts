/**
 * Shared domain types for the Kaffeed street-food POS.
 * Kept framework-agnostic so repositories, contexts, and UI all agree on shape.
 */

/**
 * Supported payment methods.
 *   CASH  — paid with physical cash.
 *   GCASH — paid by scanning the stall's GCash QR code.
 * Modeled as an enum so more methods can be added without a schema rewrite —
 * sales already carry a paymentType field.
 */
export enum PaymentType {
  CASH = 'CASH',
  GCASH = 'GCASH',
}

/**
 * Fields every syncable record carries so it can be isolated per business and
 * reconciled across devices/cloud later.
 *
 *   businessId — the owning tenant. Set from the active business on write.
 *   updatedAt  — epoch ms of the last change; used for last-write-wins conflict
 *                resolution when sync is added.
 *   isDeleted  — soft-delete tombstone. Deletions are flagged rather than
 *                hard-removed so the deletion can propagate through sync instead
 *                of a row silently reappearing from another device. Reads filter
 *                tombstones out. (Named `isDeleted` because RxDB reserves the
 *                top-level field name `deleted`; it maps to the Postgres
 *                `deleted` column at the sync boundary.)
 *
 * All optional so records created before this was introduced (and the existing
 * test fixtures) remain valid; the migration backfills real values.
 */
export interface SyncMeta {
  businessId?: string;
  updatedAt?: number;
  isDeleted?: boolean;
}

/**
 * How many options a customer may pick from a modifier group.
 *   single   — exactly one (e.g. Size, Flavour). Radio-style.
 *   multiple — zero or more (e.g. Add-ons). Checkbox-style.
 */
export type ModifierSelectionType = 'single' | 'multiple';

/**
 * One choice within a modifier group. `priceDelta` is added to the item's base
 * price when selected (can be 0, or negative for a discount).
 */
export interface ModifierOption {
  /** Stable id, unique within its group. Used as the selection key. */
  id: string;
  name: string;
  /** Amount added to base price when chosen, in PHP (e.g. 20 for +₱20). */
  priceDelta: number;
}

/**
 * A group of related choices attached to a menu item, e.g. "Size", "Flavour",
 * or "Add-ons".
 */
export interface ModifierGroup {
  /** Stable id, unique within its menu item. */
  id: string;
  name: string;
  selectionType: ModifierSelectionType;
  /** For `single` groups: must the customer pick one before adding to cart? */
  required: boolean;
  options: ModifierOption[];
}

/**
 * A sellable menu item. Finished dishes/drinks are not inventory-tracked; the
 * only availability control is the `available` ("in stock" / "sold out") flag.
 */
export interface MenuItem extends SyncMeta {
  /**
   * Primary key. A string UUID (assigned on insert by the store) so ids are
   * stable across devices and match the cloud Postgres UUID keys for sync.
   * Absent before insert.
   */
  id?: string;
  name: string;
  /** Grouping shown as tabs on checkout, e.g. "Drinks", "Snacks". */
  category: string;
  /** Price before any modifiers, in PHP (plain number, e.g. 55). */
  basePrice: number;
  /** When false the item is hidden from checkout (sold out), but kept on file. */
  available: boolean;
  /** Optional sizes/flavours/add-ons. Empty array = a plain item. */
  modifierGroups: ModifierGroup[];
  /**
   * Simple stock tracking (opt-in). Street food cooked on demand is not
   * stock-counted, so tracking is off by default. When `trackStock` is true,
   * `stockQty` is decremented as the item sells and restored when a sale is
   * voided; at 0 the item is treated as sold out on checkout. `lowStockThreshold`
   * drives a "running low" warning (at or below the threshold, but above 0).
   */
  trackStock?: boolean;
  stockQty?: number;
  lowStockThreshold?: number;
}

/**
 * A modifier choice as captured on a sale line. Snapshotted (name + priceDelta)
 * so a receipt stays accurate even if the menu item is edited later.
 */
export interface SelectedModifier {
  groupName: string;
  optionName: string;
  priceDelta: number;
}

/**
 * A line item captured at the moment of sale. Item name, base price and chosen
 * modifiers are all snapshotted for an accurate historical receipt.
 */
export interface SaleItem {
  menuItemId: string;
  name: string;
  /** Price before modifiers at time of sale. */
  basePrice: number;
  selectedModifiers: SelectedModifier[];
  /** basePrice + sum(selectedModifiers.priceDelta). */
  unitPrice: number;
  quantity: number;
  /** unitPrice * quantity. */
  lineTotal: number;
}

export interface Sale extends SyncMeta {
  /** Primary key — string UUID assigned on insert. Absent before insert. */
  id?: string;
  /** Epoch milliseconds when the sale completed. */
  timestamp: number;
  /** ISO date (YYYY-MM-DD) in local time, indexed for daily reporting. */
  dateKey: string;
  items: SaleItem[];
  /** Sum of all line totals. */
  total: number;
  paymentType: PaymentType;
  /**
   * When true the sale was voided (e.g. an accidental transaction) and must be
   * excluded from reporting totals. The record is kept — never hard-deleted —
   * so it remains in the audit trail. Absent on sales made before v3.
   */
  voided?: boolean;
  /** Epoch milliseconds when the sale was voided. */
  voidedAt?: number;
}
