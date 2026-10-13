/**
 * Lightweight admin gate configuration.
 *
 * This is a *soft* lock to stop a cashier from accidentally voiding sales or
 * editing prices on a shared device — not a security boundary (the app is
 * frontend-only, so a determined user could bypass it). Change the PIN here.
 */
export const ADMIN_PIN = '1234';

/** Session storage key: admin stays unlocked until the tab/app is closed. */
export const ADMIN_UNLOCK_KEY = 'kaffeed-admin-unlocked';
