# Sync, conflicts & offline behaviour (Phase 1)

How the global (multi-tenant cloud) build syncs data, resolves conflicts, and
behaves offline. The client (`master`) build is offline-only and none of this
applies to it.

## Architecture

- **Local store:** RxDB on the Dexie (IndexedDB) RxStorage — the single source
  the UI reads/writes, always available offline (ADR 0001).
- **Cloud store of record:** Supabase Postgres, with Row-Level Security scoping
  every row to a `business_id`.
- **Replication:** `src/db/replication.ts` uses RxDB's built-in
  `replicateRxCollection` to run bidirectional, tenant-scoped sync for the
  `menu_items` and `sales` tables. It is started per signed-in business from
  `AuthContext` and torn down on sign-out / business switch.

## Offline-first behaviour

- The app reads and writes **locally first**; the UI never waits on the network.
- When Supabase is unconfigured, or no one is signed in, replication is a
  **no-op** — the app runs purely local (this is also the client build).
- When offline, local writes accumulate in RxDB. On reconnect, RxDB's
  replication resumes from its checkpoint and pushes the queued changes, then
  pulls anything new. No data is lost during an outage; the cloud copy
  converges once connectivity returns.
- The header shows a sync indicator: **Synced** (online + replicating),
  **Offline** (replicating but no connectivity), **Sync error** (a stream
  errored). It is hidden entirely in local-only mode.

## Conflict resolution — Last-Write-Wins (LWW)

Every row carries `updatedAt` (client, epoch ms) ↔ `updated_at` (Postgres,
timestamptz). On push, the handler compares the incoming local change against
the current server `updated_at`:

- **Local newer or equal →** the local change is upserted to the server.
- **Server newer →** the push reports a conflict, and RxDB pulls the server
  state down, so the newer write wins on both sides.

This is intentional for a single-device-per-business POS: concurrent edits to
the same row from two devices are rare, and "the most recent edit wins" is the
predictable, explainable rule for a stall owner. Deletions propagate as
tombstones (`isDeleted` client ↔ `deleted` column), so a delete on one device
is not resurrected by a stale copy on another.

## Field mapping (client ↔ Postgres)

| Client (RxDB, camelCase) | Postgres (snake_case) | Notes                         |
| ------------------------ | --------------------- | ----------------------------- |
| `basePrice`              | `base_price`          |                               |
| `modifierGroups`         | `modifier_groups`     | jsonb                         |
| `trackStock`             | `track_stock`         |                               |
| `stockQty`               | `stock_qty`           |                               |
| `lowStockThreshold`      | `low_stock_threshold` |                               |
| `businessId`             | `business_id`         | tenant key                    |
| `dateKey`                | `date_key`            |                               |
| `paymentType`            | `payment_type`        |                               |
| `timestamp` (epoch ms)   | `ts` (timestamptz)    | sales                         |
| `voidedAt` (epoch ms)    | `voided_at`           |                               |
| `updatedAt` (epoch ms)   | `updated_at`          | LWW comparator                |
| `isDeleted`              | `deleted`             | RxDB reserves `deleted`       |

The mappers are pure functions in `src/db/replication.ts`, unit-tested in
`src/db/replication.test.ts`.

## Manual verification checklist (needs a real browser)

Automated tests cover the mappers, the offline no-op path, and (separately via
`scripts/verify-rls.mjs`) the authenticated data path + RLS. The live
replication **loop** must be checked manually, because it needs a browser:

1. `npm run build && npm run preview` with Supabase env vars set.
2. Sign up / sign in; create a business (owner).
3. **Push:** add a menu item → confirm the row appears in the Supabase
   `menu_items` table (dashboard) with the correct `business_id`.
4. **Pull:** insert a row in Supabase for that business → confirm it appears in
   the app without reload.
5. **Offline queue:** DevTools → Network → Offline. Make a sale / edit an item.
   Confirm it persists locally and the indicator shows **Offline**. Go back
   online → confirm the change reaches Supabase and the indicator returns to
   **Synced**.
6. **Tenant isolation:** sign in as a second business in another browser
   profile → confirm it never sees the first business's data.
7. **PWA/offline shell:** install the PWA, fully quit the network, relaunch →
   confirm the app shell loads and local data is usable.
