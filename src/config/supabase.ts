import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase client (cloud server of record for the multi-tenant platform).
 *
 * Credentials come from Vite env vars (see `.env.example`). The anon key is
 * safe in the client — Row-Level Security on the database enforces that one
 * business never sees another's data.
 *
 * The app is offline-first: it must still boot and run with no cloud
 * configuration at all (e.g. in tests, or before a vendor signs in). So this
 * module never throws at import time. Call `getSupabase()` where cloud access
 * is required; it returns null when unconfigured, and callers fall back to the
 * local-only path.
 */

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** True when both env vars are present, i.e. cloud features can be used. */
export const isSupabaseConfigured = Boolean(url && anonKey);

let client: SupabaseClient | null = null;

/**
 * Lazily create and return the shared Supabase client, or null if the project
 * is not configured. Lazy so an unconfigured app pays no cost and never errors.
 */
export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (!client) {
    client = createClient(url!, anonKey!, {
      auth: {
        // Persist the session so a signed-in vendor stays signed in across
        // app launches (important for a device left running at a stall).
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }
  return client;
}
