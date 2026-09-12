"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { usePlatformRole } from "@/components/platform/use-platform-role";

/**
 * Gates /superadmin/*. Same shape as AdminRoute — real Firebase login is
 * always required; only role is demo-overridable in development. There is
 * no real "super_admin" concept in Firestore yet (out of scope for this
 * frontend-only phase), so outside of the demo switcher this route is
 * unreachable by design until backend role authorization lands.
 */
export function SuperAdminRoute({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { role, loading: roleLoading } = usePlatformRole();
  const router = useRouter();

  const hasSuperAdminAccess = role === "super_admin";
  const ready = !authLoading && !roleLoading;

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (!hasSuperAdminAccess) router.replace("/overview");
  }, [ready, user, hasSuperAdminAccess, router]);

  if (!ready || !user || !hasSuperAdminAccess) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <>{children}</>;
}
