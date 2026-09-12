"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
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
  const [demoRole, setDemoRoleState] = useState<PlatformRole | null>(readStoredDemoRole);

  function setDemoRole(role: PlatformRole | null) {
    if (!isDemoModeEnabled) return;
    setDemoRoleState(role);
    if (typeof window === "undefined") return;
    if (role) window.localStorage.setItem(STORAGE_KEY, role);
    else window.localStorage.removeItem(STORAGE_KEY);
  }

  return <DemoRoleContext.Provider value={{ demoRole, setDemoRole }}>{children}</DemoRoleContext.Provider>;
}

export function useDemoRole(): DemoRoleContextValue {
  return useContext(DemoRoleContext);
}
