"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { usePlatformRole } from "@/components/platform/use-platform-role";

/**
 * Gates /admin/*. Real Firebase login is always required. `role` here comes
 * from usePlatformRole(), which layers the dev-only demo switcher
 * (components/platform/demo-role-provider.tsx) on top of the real,
 * claims-derived role from AuthProvider — outside of a dev build previewing
 * a shell, this is exactly the real role, backed by a real custom claim and
 * enforced identically in firestore.rules; frontend hiding here is not the
 * security boundary, just the routing decision that matches it. Super
 * admins also have admin access (a superset), matching a typical role
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
