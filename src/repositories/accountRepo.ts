import type { Session, User } from '@supabase/supabase-js';
import { getSupabase, isSupabaseConfigured } from '../config/supabase';

/**
 * Account / authentication access, behind the repository boundary (UI and
 * contexts call this, never the Supabase client directly).
 *
 * Offline-first contract: the app must run with no cloud configured and with no
 * one signed in. Every function here degrades gracefully — when Supabase is not
 * configured it returns a clear "unconfigured" result instead of throwing, so a
 * signed-out device simply operates in local single-business mode.
 */

export type MembershipRole = 'owner' | 'cashier';

export interface Membership {
  businessId: string;
  businessName: string;
  role: MembershipRole;
}

export class AuthUnconfiguredError extends Error {
  constructor() {
    super(
      'Cloud accounts are not configured on this device. Running in local-only mode.'
    );
    this.name = 'AuthUnconfiguredError';
  }
}

/** Whether cloud accounts are available at all on this build/device. */
export function isCloudEnabled(): boolean {
  return isSupabaseConfigured;
}

/** Current session, or null if signed out / unconfigured. */
export async function getSession(): Promise<Session | null> {
  const supa = getSupabase();
  if (!supa) return null;
  const { data } = await supa.auth.getSession();
  return data.session ?? null;
}

/** Subscribe to auth state changes. Returns an unsubscribe function (no-op if unconfigured). */
export function onAuthChange(
  cb: (session: Session | null) => void
): () => void {
  const supa = getSupabase();
  if (!supa) return () => {};
  const { data } = supa.auth.onAuthStateChange((_event, session) => {
    cb(session ?? null);
  });
  return () => data.subscription.unsubscribe();
}

/** Create an account. Throws AuthUnconfiguredError if cloud is unavailable. */
export async function signUp(
  email: string,
  password: string
): Promise<User | null> {
  const supa = getSupabase();
  if (!supa) throw new AuthUnconfiguredError();
  const { data, error } = await supa.auth.signUp({ email, password });
  if (error) throw error;
  return data.user ?? null;
}

/** Sign in with email + password. Throws AuthUnconfiguredError if unavailable. */
export async function signIn(
  email: string,
  password: string
): Promise<User | null> {
  const supa = getSupabase();
  if (!supa) throw new AuthUnconfiguredError();
  const { data, error } = await supa.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data.user ?? null;
}

/** Sign out. Safe no-op if unconfigured. */
export async function signOut(): Promise<void> {
  const supa = getSupabase();
  if (!supa) return;
  await supa.auth.signOut();
}

/**
 * Resolve the signed-in user's membership (their business + role). Returns the
 * first membership — Phase 1 is one business per user. Null when signed out,
 * unconfigured, or not yet a member of any business.
 */
export async function getMembership(): Promise<Membership | null> {
  const supa = getSupabase();
  if (!supa) return null;
  const { data, error } = await supa
    .from('memberships')
    .select('role, businesses ( id, name )')
    .limit(1)
    .maybeSingle();
  if (error || !data || !data.businesses) return null;
  // supabase types the joined row loosely; narrow it.
  const biz = data.businesses as unknown as { id: string; name: string };
  return {
    businessId: biz.id,
    businessName: biz.name,
    role: data.role as MembershipRole,
  };
}

/**
 * Bootstrap a brand-new business for the signed-in user: create the business
 * row and the owner membership. This is the flow verified in scripts/verify-rls.mjs
 * (create business → add own membership). Returns the new business id.
 */
export async function bootstrapBusiness(name: string): Promise<string> {
  const supa = getSupabase();
  if (!supa) throw new AuthUnconfiguredError();

  const { data: userRes } = await supa.auth.getUser();
  const userId = userRes.user?.id;
  if (!userId) throw new Error('Must be signed in to create a business.');

  const { data: biz, error: bizErr } = await supa
    .from('businesses')
    .insert({ name: name.trim() })
    .select()
    .single();
  if (bizErr || !biz) throw bizErr ?? new Error('Could not create business.');

  const { error: memErr } = await supa
    .from('memberships')
    .insert({ business_id: biz.id, user_id: userId, role: 'owner' });
  if (memErr) throw memErr;

  return biz.id as string;
}

export const accountRepo = {
  isCloudEnabled,
  getSession,
  onAuthChange,
  signUp,
  signIn,
  signOut,
  getMembership,
  bootstrapBusiness,
};
