"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import type { PlatformRole } from "@/types/platform";

const STORAGE_KEY = "taskora-demo-role";

/**
 * Dev-only demo role override — lets the platform's three experiences (Super
 * Admin / Admin / User) be previewed before real backend authorization
 * exists. Never active in a production build, and never a substitute for
 * real authorization: it only decides what the frontend *shows*, and every
 * real Firestore read/write still goes through the actual security rules
 * regardless of this value.
 */
export const isDemoModeEnabled = process.env.NODE_ENV !== "production";

function readStoredDemoRole(): PlatformRole | null {
  if (!isDemoModeEnabled || typeof window === "undefined") return null;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "super_admin" || stored === "admin" || stored === "user") return stored;
  return null;
}

interface DemoRoleContextValue {
  demoRole: PlatformRole | null;
  setDemoRole: (role: PlatformRole | null) => void;
}

const DemoRoleContext = createContext<DemoRoleContextValue>({ demoRole: null, setDemoRole: () => {} });

export function DemoRoleProvider({ children }: { children: ReactNode }) {
  // Rendered inside AuthProvider (see app/layout.tsx), so this can read the
  // REAL, claims-derived identity directly — needed below to stop a demo
  // selection from outliving the account that set it.
  const { user, loading } = useAuth();
  const [demoRole, setDemoRole] = useState<PlatformRole | null>(readStoredDemoRole);
  // `undefined` = "haven't observed a resolved auth state yet" (distinct
  // from `null`, which means "resolved, and genuinely signed out").
  const [syncedUid, setSyncedUid] = useState<string | null | undefined>(undefined);

  // ROOT-CAUSE FIX (auth/RBAC audit): a stored demo-role selection must
  // never outlive the real account that set it. usePlatformRole() layers
  // this override on top of the real role from AuthProvider, and
  // AdminRoute/SuperAdminRoute read THAT layered value to decide real
  // route access — so a leftover "User Demo" selection from an earlier or
  // different account in the same browser silently downgrades a genuinely
  // authorized Admin/Super Admin account straight back to the User
  // dashboard the moment they land on /admin or /superadmin, even though
  // registration/login itself resolved their role correctly. This was
  // previously patched only at the two explicit "Logout" button handlers
  // (Topbar, PlatformShell) — real but incomplete, since ANY other path
  // that changes who's authenticated (a fresh registration in a browser
  // that still had a previous account's demo selection sitting in
  // localStorage, a token expiring and a different account signing in,
  // etc.) was never covered. Tying this to the actual resolved uid — the
  // one true identity signal — closes every path at once, not just the
  // two buttons.
  //
  // Only a genuine uid CHANGE clears it (a different account signs in, or
  // sign-out) — never the initial load, so a plain page refresh while
  // legitimately previewing under the SAME account is preserved. Render-
  // body state adjustment, not a useEffect, per this repo's own
  // react-hooks/set-state-in-effect convention (see settings-view.tsx's
  // syncedDisplayName/syncedTitle/syncedNotifPrefs for the same pattern).
  if (!loading) {
    const currentUid = user?.uid ?? null;
    if (syncedUid === undefined) {
      setSyncedUid(currentUid);
    } else if (syncedUid !== currentUid) {
      setSyncedUid(currentUid);
      setDemoRole(null);
    }
  }

  // Persisting to localStorage is a genuine external-system side effect
  // (not React state), so — unlike the state adjustment above — this
  // belongs in an effect, not the render body.
  useEffect(() => {
    if (!isDemoModeEnabled || typeof window === "undefined") return;
    if (demoRole) window.localStorage.setItem(STORAGE_KEY, demoRole);
    else window.localStorage.removeItem(STORAGE_KEY);
  }, [demoRole]);

  function updateDemoRole(role: PlatformRole | null) {
    if (!isDemoModeEnabled) return;
    setDemoRole(role);
  }

  return <DemoRoleContext.Provider value={{ demoRole, setDemoRole: updateDemoRole }}>{children}</DemoRoleContext.Provider>;
}

export function useDemoRole(): DemoRoleContextValue {
  return useContext(DemoRoleContext);
}
