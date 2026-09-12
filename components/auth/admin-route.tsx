"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { usePlatformRole } from "@/components/platform/use-platform-role";

/**
 * Gates /admin/*. Real Firebase login is always required — the dev-only demo
 * switcher (components/platform/demo-role-provider.tsx) can only change
 * which *role* a logged-in session is treated as, never bypass auth itself.
 * Super admins also have admin access (a superset), matching a typical role
 * hierarchy.
 */
export function AdminRoute({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { role, loading: roleLoading } = usePlatformRole();
  const router = useRouter();

  const hasAdminAccess = role === "admin" || role === "super_admin";
  const ready = !authLoading && !roleLoading;

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (!hasAdminAccess) router.replace("/overview");
  }, [ready, user, hasAdminAccess, router]);

  if (!ready || !user || !hasAdminAccess) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <>{children}</>;
}
