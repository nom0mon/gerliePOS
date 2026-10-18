# ADR 0001 — Sync engine for the offline-first multi-tenant platform

Status: Accepted (Phase 1, Task 3)
Date: 2026-10-15

## Context

Phase 1 turns the single-device Kaffeed POS into a multi-business platform with
cloud sync (Supabase/Postgres as server of record, decided in Task 4). We need a
client-side local-first sync engine. Hard constraints from the product brief:

- Must run on **older / low-end devices** (vendors can't all afford new phones).
- Must be **offline-first**: full function offline, auto-cache during outages,
  reconcile on reconnect.
- Should fit the existing React + IndexedDB (Dexie) app, behind the existing
  `menuRepo` / `saleRepo` repository boundary.

Candidates evaluated: **RxDB** vs **PowerSync** (ElectricSQL was dropped earlier —
it pivoted away from offline CRDT sync).

## Evidence gathered

Measured in an isolated spike (`spike-sync/`, since removed) using the same
esbuild toolchain, minified + gzipped, **WASM excluded**:

| Engine                         | Raw JS   | Gzipped JS | Extra runtime assets                |
| ------------------------------ | -------- | ---------- | ----------------------------------- |
| RxDB (core + Dexie storage)    | 237.5 kB | **77.7 kB**| none (reuses existing IndexedDB)    |
| PowerSync (web)                | 1156.4 kB| **370.7 kB**| **+ SQLite WASM binary + workers** |

- The app bundle is already ~131 kB gzip (after adding `@supabase/supabase-js`).
  Adding RxDB (~78 kB) is tolerable; PowerSync (371 kB JS **plus** a WASM binary
  and worker files downloaded separately) would roughly 3–4× the payload and add
  WASM warm-up cost.
- PowerSync's own docs state the browser **IndexedDB storage mode (the most
  broadly compatible with old browsers) is "slow"**; the fast path (OPFS) has
  weaker old-browser support — a poor fit for the low-end-device constraint.
- **Licensing:** RxDB core is **Apache-2.0** (unrestricted commercial use).
  PowerSync's web SDK carries more restrictive terms. Lower legal risk with RxDB.
- **Fit:** RxDB is storage-agnostic and runs directly on **Dexie/IndexedDB** —
  the exact storage the app already uses — so the Task 6 migration is incremental
  and reversible. It has a two-way **Supabase replication plugin** with custom
  conflict resolution (needed for Task 7).
- **Functional check:** RxDB on the Dexie/IndexedDB adapter passed a headless
  smoke test (create DB → insert → tenant-scoped query → reactive patch).
  See the former `spike-sync/rxdb-smoke.mjs` → "PASS".

## Decision

Use **RxDB** with the **Dexie (IndexedDB) RxStorage** and the **Supabase
replication plugin** as the Phase 1 sync engine.

## Consequences

- Task 6 reimplements `menuRepo`/`saleRepo`/`stockRepo` against RxDB collections
  behind their existing signatures, with a one-time import of current Dexie
  `kaffeed-pos` data. Storage stays IndexedDB-backed, so the migration is low-risk.
- Task 7 wires the Supabase replication plugin, scoped per `businessId`, with
  last-write-wins conflict resolution using the `updatedAt` field already added
  in Task 1.
- Production builds must **disable RxDB dev-mode** (it logs and slows things).
- The free Dexie storage is sufficient for stall-scale data; RxDB "premium"
  storages are not required.
- If future scale needs SQLite performance, RxDB's pluggable storage lets us
  swap the storage layer without rewriting app code — PowerSync would be a full
  re-integration.

## Not chosen

- **PowerSync** — strongest offline pedigree, but the bundle + WASM weight and
  the "slow" compatible-storage mode conflict with the low-end-device constraint.
- **ElectricSQL** — pivoted away from offline bidirectional sync.
