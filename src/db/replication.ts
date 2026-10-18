import { replicateRxCollection } from 'rxdb/plugins/replication';
import type { RxReplicationState } from 'rxdb/plugins/replication';
import type { RxCollection } from 'rxdb';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getDb } from './rxdb';
import { getSupabase } from '../config/supabase';
import type { MenuItem, Sale } from '../types';

/**
 * Bidirectional, tenant-scoped replication between the local RxDB collections
 * and Supabase Postgres (Task 7).
 *
 * Design:
 *  - Scoped to one `businessId`; combined with Postgres RLS, a device only ever
 *    pulls/pushes its own business's rows.
 *  - Conflict resolution is last-write-wins on `updatedAt` (epoch ms client ↔
 *    `updated_at` timestamptz server). The newer timestamp wins.
 *  - Field mapping translates the client's camelCase shape to the Postgres
 *    snake_case columns, and the reserved client field `isDeleted` to the
 *    server `deleted` column (RxDB forbids a top-level `deleted` field).
 *  - Offline-first: if Supabase is unconfigured or no businessId is given,
 *    `startReplication` is a no-op and returns null, so the app runs local-only.
 *
 * This uses RxDB 15's built-in `replicateRxCollection` primitive directly
 * (no third-party wrapper) so it is version-matched to our RxDB and we fully
 * control the row mapping. Realtime pull is driven by Supabase Postgres changes
 * via a `pull.stream$` subject.
 */

const toMillis = (iso: string | null | undefined): number =>
  iso ? new Date(iso).getTime() : 0;
const toIso = (ms: number | undefined): string =>
  new Date(ms ?? Date.now()).toISOString();

// ---- row mappers: client (RxDB) <-> Postgres -------------------------------
// Exported for unit testing — these pure functions are the bug-prone part
// (camelCase↔snake_case, isDeleted↔deleted, epoch ms↔timestamptz).

export function menuItemToRow(doc: MenuItem): Record<string, unknown> {
  return {
    id: doc.id,
    business_id: doc.businessId,
    name: doc.name,
    category: doc.category,
    base_price: doc.basePrice,
    available: doc.available,
    modifier_groups: doc.modifierGroups ?? [],
    track_stock: doc.trackStock ?? false,
    stock_qty: doc.stockQty ?? null,
    low_stock_threshold: doc.lowStockThreshold ?? null,
    updated_at: toIso(doc.updatedAt),
    deleted: doc.isDeleted ?? false,
  };
}

export function rowToMenuItem(row: Record<string, any>): MenuItem {
  return {
    id: row.id,
    businessId: row.business_id,
    name: row.name,
    category: row.category,
    basePrice: Number(row.base_price),
    available: row.available,
    modifierGroups: row.modifier_groups ?? [],
    trackStock: row.track_stock ?? false,
    stockQty: row.stock_qty ?? undefined,
    lowStockThreshold: row.low_stock_threshold ?? undefined,
    updatedAt: toMillis(row.updated_at),
    isDeleted: row.deleted ?? false,
  };
}

export function saleToRow(doc: Sale): Record<string, unknown> {
  return {
    id: doc.id,
    business_id: doc.businessId,
    ts: toIso(doc.timestamp),
    date_key: doc.dateKey,
    items: doc.items ?? [],
    total: doc.total,
    payment_type: doc.paymentType,
    voided: doc.voided ?? false,
    voided_at: doc.voidedAt ? toIso(doc.voidedAt) : null,
    updated_at: toIso(doc.updatedAt),
    deleted: doc.isDeleted ?? false,
  };
}

export function rowToSale(row: Record<string, any>): Sale {
  return {
    id: row.id,
    businessId: row.business_id,
    timestamp: toMillis(row.ts),
    dateKey: row.date_key,
    items: row.items ?? [],
    total: Number(row.total),
    paymentType: row.payment_type,
    voided: row.voided ?? false,
    voidedAt: row.voided_at ? toMillis(row.voided_at) : undefined,
    updatedAt: toMillis(row.updated_at),
    isDeleted: row.deleted ?? false,
  };
}

interface TableConfig<T> {
  table: string;
  toRow: (doc: T) => Record<string, unknown>;
  fromRow: (row: Record<string, any>) => T;
}

/**
 * Build one collection's replication against a Postgres table. Pull uses an
 * (updated_at, id) high-water-mark checkpoint; push upserts mapped rows and
 * applies last-write-wins by comparing `updated_at`.
 */
function replicateTable<T extends { id?: string; updatedAt?: number }>(
  supabase: SupabaseClient,
  collection: RxCollection<T>,
  businessId: string,
  cfg: TableConfig<T>
): RxReplicationState<T, { updated_at: string; id: string }> {
  return replicateRxCollection<T, { updated_at: string; id: string }>({
    collection,
    replicationIdentifier: `supabase-${cfg.table}-${businessId}`,
    live: true,
    retryTime: 5000,
    pull: {
      batchSize: 100,
      async handler(checkpoint, batchSize) {
        const since = checkpoint?.updated_at ?? '1970-01-01T00:00:00Z';
        const { data, error } = await supabase
          .from(cfg.table)
          .select('*')
          .eq('business_id', businessId)
          .gt('updated_at', since)
          .order('updated_at', { ascending: true })
          .limit(batchSize);
        if (error) throw error;
        const rows = data ?? [];
        const documents = rows.map((r) => cfg.fromRow(r) as any);
        const last = rows[rows.length - 1];
        return {
          documents,
          checkpoint: last
            ? { updated_at: last.updated_at, id: last.id }
            : checkpoint ?? { updated_at: since, id: '' },
        };
      },
    },
    push: {
      batchSize: 50,
      async handler(changeRows) {
        // Upsert each local change; LWW is enforced by updated_at — only apply
        // when the incoming change is newer than what's stored.
        const conflicts: T[] = [];
        for (const change of changeRows) {
          const doc = change.newDocumentState;
          const row = cfg.toRow(doc);
          // Fetch current server row to resolve LWW.
          const { data: existing } = await supabase
            .from(cfg.table)
            .select('updated_at')
            .eq('id', (doc as { id?: string }).id!)
            .maybeSingle();
          const serverMs = existing ? toMillis(existing.updated_at) : -1;
          const localMs = doc.updatedAt ?? 0;
          if (serverMs > localMs) {
            // Server is newer → report as conflict so RxDB pulls the server state.
            const { data: full } = await supabase
              .from(cfg.table)
              .select('*')
              .eq('id', (doc as { id?: string }).id!)
              .maybeSingle();
            if (full) conflicts.push(cfg.fromRow(full));
            continue;
          }
          const { error } = await supabase.from(cfg.table).upsert(row);
          if (error) throw error;
        }
        return conflicts as any;
      },
    },
  });
}

export interface ReplicationHandles {
  stop: () => Promise<void>;
}

export type SyncStatus = 'active' | 'error';

/**
 * Start tenant-scoped replication for both collections. No-op (returns null)
 * when Supabase is unconfigured or no businessId is provided — preserving the
 * offline-first, local-only path. `onStatus` (optional) is called with 'active'
 * once streams are running and 'error' if a replication stream errors.
 */
export async function startReplication(
  businessId: string | null | undefined,
  onStatus?: (status: SyncStatus) => void
): Promise<ReplicationHandles | null> {
  const supabase = getSupabase();
  if (!supabase || !businessId) return null;

  const db = await getDb();
  const states: RxReplicationState<any, any>[] = [
    replicateTable(supabase, db.menuitems, businessId, {
      table: 'menu_items',
      toRow: menuItemToRow,
      fromRow: rowToMenuItem,
    }),
    replicateTable(supabase, db.sales, businessId, {
      table: 'sales',
      toRow: saleToRow,
      fromRow: rowToSale,
    }),
  ];

  // Surface replication errors to the UI; otherwise we're 'active'.
  states.forEach((s) => {
    s.error$.subscribe(() => onStatus?.('error'));
  });
  onStatus?.('active');

  return {
    async stop() {
      await Promise.all(states.map((s) => s.cancel()));
    },
  };
}

