"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { usePlatformRole } from "@/components/platform/use-platform-role";
import { isIntentionalLogout } from "@/lib/logout-state";

/**
 * Gates /superadmin/*. Same shape as AdminRoute — real Firebase login is
 * always required; role comes from usePlatformRole() (the real,
 * claims-derived role from AuthProvider, with only a dev-build demo
 * override layered on top — see components/platform/demo-role-provider.tsx).
 * super_admin is a real role here: a genuine custom claim set only by
 * scripts/bootstrap-super-admin.mjs, enforced identically in
 * firestore.rules — this route is unreachable to anyone without that real
 * claim outside of a dev-only demo preview.
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
      // A deliberate logout also flips `user` to null — its own handler
      // already owns navigating to "/" for that case; only redirect to
      // /login for a genuine "never signed in" / session-expired visit.
      if (!isIntentionalLogout()) router.replace("/login");
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
