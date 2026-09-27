"use client";

import { useCallback } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { shellPath } from "@/lib/shell-routes";

/**
 * For links written as member-workspace paths inside views both shells share
 * (project detail, meetings, calendar, notifications, search): returns the
 * right shell's path for the signed-in role — see lib/shell-routes.ts.
 */
export function useShellHref(): (path: string) => string {
  const { role } = useAuth();
  return useCallback((path: string) => shellPath(path, role), [role]);
}
