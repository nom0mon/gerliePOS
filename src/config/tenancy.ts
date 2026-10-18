/**
 * Tenancy configuration.
 *
 * Phase 1 turns the single-device POS into a multi-business ("multi-tenant")
 * platform. Every syncable record carries a `businessId` so that, once cloud
 * sync and Row-Level Security are wired up, the database can guarantee one
 * business never sees another's data.
 *
 * Until real authentication exists (a later Phase 1 task), the app runs as a
 * single implicit "local" business. All existing on-device data is stamped with
 * this stable id so it has a consistent tenant key from day one. When auth lands
 * it will replace *how* the active business id is obtained — not the field
 * itself — so the data model does not change again.
 */

/** Stable tenant id used before real auth assigns a cloud business id. */
export const LOCAL_BUSINESS_ID = 'local-business';

/**
 * The business id the app should stamp onto new records right now.
 * Centralised so later tasks can swap this for the signed-in user's business
 * without touching every repository.
 */
export function activeBusinessId(): string {
  return LOCAL_BUSINESS_ID;
}
