"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { isIntentionalLogout } from "@/lib/logout-state";
import { ROLE_HOME_PATH } from "@/lib/platform/constants";
import { adminShellPath } from "@/lib/shell-routes";

// The member workspace (app/(app)/*) is the individual-contributor
// experience — its sidebar is personal (My Profile, My Credits, My
// Performance). Organization Admins and Super Admins never render inside it.
// This used to whitelist /meetings, /calendar, /leaderboard and
// /projects/{id} for admins because the admin sidebar linked straight at
// those member routes, which put an admin into the member shell the moment
// they opened Meetings. Those pages now also exist inside the admin console
// (app/admin/meetings, /calendar, /leaderboard, /projects/[id]), so instead
// an admin who reaches ANY member route — sidebar, stored notification link,
// search result, typed URL, refresh or back/forward — is sent to that page's
// admin-console equivalent (lib/shell-routes.ts), query string included.
// Super Admin has no organization workspace at all and goes to its console.
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Org Admin/Super Admin have their OWN primary dashboard (/admin,
  // /superadmin) — this is never "hide the nav and hope," it's the same
  // route-guard layer that already protects every other shell, just
  // applied in the other direction: a privileged role must not be able to
  // rest in the individual-contributor workspace any more than a plain
  // member can reach the admin console.
  const mustLeaveWorkspace = role === "admin" || role === "super_admin";

  useEffect(() => {
    // A deliberate logout also flips `user` to null — its own handler
    // already owns navigating to "/" for that case; only redirect to
    // /login for a genuine "never signed in" / session-expired visit.
    if (!loading && !user && !isIntentionalLogout()) {
      router.replace("/login");
      return;
    }
    if (!loading && user && mustLeaveWorkspace && role) {
      const requested = `${pathname}${window.location.search}`;
      router.replace(role === "admin" ? (adminShellPath(requested) ?? ROLE_HOME_PATH.admin) : ROLE_HOME_PATH[role]);
    }
  }, [loading, user, mustLeaveWorkspace, role, router, pathname]);

  if (loading || !user || mustLeaveWorkspace) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <>{children}</>;
}
