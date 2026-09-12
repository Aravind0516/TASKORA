"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "firebase/auth";
import { subscribeToAuthChanges } from "@/lib/services/auth.service";
import { getSessionIdentity } from "@/lib/services/user.service";
import type { PlatformRole } from "@/types/platform";

// The ONE authoritative source of "who is signed in and what can they do."
// Every other role/organizationId read in the app (usePlatformRole's real
// branch, PlatformProvider, WorkspaceProvider) sources from here instead of
// independently re-reading Firebase ID token claims — previously each of
// those maintained its own copy, which was harmless (they all resolved the
// same claims) but exactly the "scattered, conflicting role state" risk
// flagged in the 2026-09-06 role-resolution audit. role/organizationId are
// still read exclusively from the verified ID token's custom claims — never
// a client-editable Firestore field — so nothing about this consolidation
// changes what's trusted, only how many times it's independently fetched.
interface AuthContextValue {
  user: User | null;
  /** Real role from Firebase ID token custom claims. null while loading or signed out — never guess a role before it's actually known. */
  role: PlatformRole | null;
  /** Real organizationId from custom claims. null while loading, signed out, or genuinely unaffiliated. */
  organizationId: string | null;
  /** True until BOTH the Firebase Auth state AND that user's claims have resolved. */
  loading: boolean;
  /** Re-reads role/organizationId with a forced token refresh — call after an operation that may have changed the caller's own claims (e.g. just claimed a new organization). */
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  role: null,
  organizationId: null,
  loading: true,
  refreshSession: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [identity, setIdentity] = useState<{ role: PlatformRole; organizationId: string | null } | null>(null);
  const [identityUid, setIdentityUid] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((nextUser) => {
      setUser(nextUser);
      setAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      // Deferred so this never calls setState synchronously inside the
      // effect body — same async pattern used everywhere else in this app
      // for clearing state on sign-out.
      Promise.resolve().then(() => {
        if (cancelled) return;
        setIdentity(null);
        setIdentityUid(null);
      });
      return () => {
        cancelled = true;
      };
    }
    getSessionIdentity(user).then((result) => {
      if (cancelled) return;
      setIdentity(result);
      setIdentityUid(user.uid);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  async function refreshSession() {
    if (!user) return;
    const result = await getSessionIdentity(user, true);
    setIdentity(result);
    setIdentityUid(user.uid);
  }

  const identityLoading = Boolean(user) && identityUid !== user?.uid;
  const loading = authLoading || identityLoading;

  const value: AuthContextValue = {
    user,
    role: loading ? null : (identity?.role ?? null),
    organizationId: loading ? null : (identity?.organizationId ?? null),
    loading,
    refreshSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
