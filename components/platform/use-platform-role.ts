"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { useDemoRole } from "@/components/platform/demo-role-provider";
import type { PlatformRole } from "@/types/platform";

interface PlatformRoleState {
  role: PlatformRole | null;
  loading: boolean;
  /** True when `role` came from the dev-only demo switcher, not real auth. */
  isDemo: boolean;
}

/**
 * The single source of truth for "what role should the UI render" — layers
 * the dev-only demo override on top of the real role from AuthProvider
 * (which is itself the one place that reads Firebase ID token claims).
 * Route guards and navigation read role from here; anything that decides
 * what Firestore data to actually fetch must use useAuth()'s real role/
 * organizationId directly instead, never this demo-aware value — see
 * PlatformProvider's isSuper/currentOrganizationId.
 */
export function usePlatformRole(): PlatformRoleState {
  const { demoRole } = useDemoRole();
  const { role, loading } = useAuth();

  if (demoRole) {
    return { role: demoRole, loading: false, isDemo: true };
  }
  return { role, loading, isDemo: false };
}
