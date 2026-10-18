import { describe, it, expect } from 'vitest';
import {
  menuItemToRow,
  rowToMenuItem,
  saleToRow,
  rowToSale,
} from './replication';
import { PaymentType, type MenuItem, type Sale } from '../types';

describe('replication field mapping (client ↔ Postgres)', () => {
  it('menu item round-trips through row mapping', () => {
    const item: MenuItem = {
      id: 'uuid-1',
      businessId: 'biz-1',
      name: 'Latte',
      category: 'Drinks',
      basePrice: 59.5,
      available: true,
      modifierGroups: [
        { id: 'size', name: 'Size', selectionType: 'single', required: true, options: [] },
      ],
      trackStock: true,
      stockQty: 7,
      lowStockThreshold: 2,
      updatedAt: 1_700_000_000_000,
      isDeleted: false,
    };

    const row = menuItemToRow(item) as Record<string, any>;
    // Column names are snake_case; isDeleted maps to deleted; epoch → ISO.
    expect(row.business_id).toBe('biz-1');
    expect(row.base_price).toBe(59.5);
    expect(row.track_stock).toBe(true);
    expect(row.stock_qty).toBe(7);
    expect(row.low_stock_threshold).toBe(2);
    expect(row.modifier_groups).toHaveLength(1);
    expect(row.deleted).toBe(false);
    expect(typeof row.updated_at).toBe('string');
    expect(new Date(row.updated_at as string).getTime()).toBe(1_700_000_000_000);

    const back = rowToMenuItem(row);
    expect(back).toMatchObject({
      id: 'uuid-1',
      businessId: 'biz-1',
      name: 'Latte',
      basePrice: 59.5,
      trackStock: true,
      stockQty: 7,
      lowStockThreshold: 2,
      isDeleted: false,
      updatedAt: 1_700_000_000_000,
    });
    expect(back.modifierGroups[0].name).toBe('Size');
  });

  it('isDeleted=true maps to the deleted column and back', () => {
    const row = menuItemToRow({
      id: 'x',
      businessId: 'b',
      name: 'n',
      category: 'c',
      basePrice: 1,
      available: true,
      modifierGroups: [],
      isDeleted: true,
      updatedAt: 1,
    }) as Record<string, any>;
    expect(row.deleted).toBe(true);
    expect(rowToMenuItem(row).isDeleted).toBe(true);
  });

  it('sale round-trips, mapping timestamp→ts and voidedAt', () => {
    const sale: Sale = {
      id: 'sale-1',
      businessId: 'biz-1',
      timestamp: 1_700_000_000_000,
      dateKey: '2026-10-18',
      items: [
        {
          menuItemId: 'uuid-1',
          name: 'Latte',
          basePrice: 59.5,
          selectedModifiers: [],
          unitPrice: 59.5,
          quantity: 2,
          lineTotal: 119,
        },
      ],
      total: 119,
      paymentType: PaymentType.GCASH,
      voided: true,
      voidedAt: 1_700_000_500_000,
      updatedAt: 1_700_000_500_000,
      isDeleted: false,
    };

    const row = saleToRow(sale) as Record<string, any>;
    expect(row.date_key).toBe('2026-10-18');
    expect(row.payment_type).toBe('GCASH');
    expect(new Date(row.ts as string).getTime()).toBe(1_700_000_000_000);
    expect(new Date(row.voided_at as string).getTime()).toBe(1_700_000_500_000);
    expect(row.deleted).toBe(false);

    const back = rowToSale(row);
    expect(back).toMatchObject({
      id: 'sale-1',
      timestamp: 1_700_000_000_000,
      dateKey: '2026-10-18',
      total: 119,
      paymentType: 'GCASH',
      voided: true,
      voidedAt: 1_700_000_500_000,
    });
    expect(back.items[0].menuItemId).toBe('uuid-1');
  });

  it('null voided_at maps to undefined voidedAt', () => {
    const row = saleToRow({
      id: 's',
      businessId: 'b',
      timestamp: 1,
      dateKey: '2026-01-01',
      items: [],
      total: 0,
      paymentType: PaymentType.CASH,
      updatedAt: 1,
      isDeleted: false,
    }) as Record<string, any>;
    expect(row.voided_at).toBeNull();
    expect(rowToSale(row).voidedAt).toBeUndefined();
  });
});
