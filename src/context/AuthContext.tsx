import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  accountRepo,
  type Membership,
  type MembershipRole,
} from '../repositories/accountRepo';

/**
 * Authentication state for the whole app.
 *
 * Offline-first: when cloud is not configured or no one is signed in, the app
 * still works in local single-business mode. `cloudEnabled` tells the UI
 * whether to even show sign-in. `role` drives admin gating: an owner (or a
 * signed-out local operator) can reach admin; a cashier cannot.
 */
interface AuthContextValue {
  cloudEnabled: boolean;
  loading: boolean;
  session: Session | null;
  signedIn: boolean;
  membership: Membership | null;
  /** Effective role. Signed-out local mode is treated as 'owner' (sole operator). */
  role: MembershipRole;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  createBusiness: (name: string) => Promise<void>;
  refreshMembership: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const cloudEnabled = accountRepo.isCloudEnabled();
  const [loading, setLoading] = useState(cloudEnabled);
  const [session, setSession] = useState<Session | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);

  const refreshMembership = useCallback(async () => {
    const m = await accountRepo.getMembership();
    setMembership(m);
  }, []);

  // Initialise session + subscribe to auth changes (no-op if unconfigured).
  useEffect(() => {
    if (!cloudEnabled) {
      setLoading(false);
      return;
    }
    let active = true;
    (async () => {
      const s = await accountRepo.getSession();
      if (!active) return;
      setSession(s);
      if (s) await refreshMembership();
      setLoading(false);
    })();

    const unsub = accountRepo.onAuthChange(async (s) => {
      setSession(s);
      if (s) await refreshMembership();
      else setMembership(null);
    });
    return () => {
      active = false;
      unsub();
    };
  }, [cloudEnabled, refreshMembership]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      await accountRepo.signIn(email, password);
      await refreshMembership();
    },
    [refreshMembership]
  );

  const signUp = useCallback(
    async (email: string, password: string) => {
      await accountRepo.signUp(email, password);
    },
    []
  );

  const signOut = useCallback(async () => {
    await accountRepo.signOut();
    setMembership(null);
  }, []);

  const createBusiness = useCallback(
    async (name: string) => {
      await accountRepo.bootstrapBusiness(name);
      await refreshMembership();
    },
    [refreshMembership]
  );

  const signedIn = session != null;
  // Signed-out local operator is the sole user → treat as owner so the current
  // offline single-device experience (full admin access) is unchanged.
  const role: MembershipRole = signedIn ? membership?.role ?? 'cashier' : 'owner';

  const value = useMemo<AuthContextValue>(
    () => ({
      cloudEnabled,
      loading,
      session,
      signedIn,
      membership,
      role,
      signIn,
      signUp,
      signOut,
      createBusiness,
      refreshMembership,
    }),
    [
      cloudEnabled,
      loading,
      session,
      signedIn,
      membership,
      role,
      signIn,
      signUp,
      signOut,
      createBusiness,
      refreshMembership,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
