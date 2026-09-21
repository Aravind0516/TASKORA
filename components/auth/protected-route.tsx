"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { isIntentionalLogout } from "@/lib/logout-state";
import { ROLE_HOME_PATH } from "@/lib/platform/constants";

// A small set of (app)-shell routes that Admin/Super Admin ALSO reach
// directly today (see components/platform/nav-config.ts's ADMIN_NAV/
// SUPER_ADMIN_NAV, which deliberately link straight at these bare routes
// rather than duplicating them under /admin — Meetings/Calendar/Leaderboard
// have no admin-specific equivalent, and Profile/Settings are per-account).
// Everything else under (app) — /overview, /tasks, /kanban, /team,
// /projects (the bare list), /credits, /performance, /analytics — is the
// individual-contributor "workspace" experience: exactly the "User
// Dashboard" an ORG_ADMIN/SUPER_ADMIN must never be left resting in, even
// by direct URL entry. /projects/{id} is its own exception (see below): the
// shared project detail page, reached e.g. from the admin Work Verification
// list (components/admin/admin-work-verification-view.tsx).
const SHARED_WORKSPACE_ROUTES = new Set(["/profile", "/settings", "/meetings", "/calendar", "/leaderboard"]);

function isAllowedForPrivilegedRole(pathname: string): boolean {
  if (SHARED_WORKSPACE_ROUTES.has(pathname)) return true;
  if (/^\/projects\/[^/]+/.test(pathname)) return true; // project detail only, never the bare /projects list
  return false;
}

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
  const isPrivilegedRole = role === "admin" || role === "super_admin";
  const mustLeaveWorkspace = isPrivilegedRole && !isAllowedForPrivilegedRole(pathname);

  useEffect(() => {
    // A deliberate logout also flips `user` to null — its own handler
    // already owns navigating to "/" for that case; only redirect to
    // /login for a genuine "never signed in" / session-expired visit.
    if (!loading && !user && !isIntentionalLogout()) {
      router.replace("/login");
      return;
    }
    if (!loading && user && mustLeaveWorkspace && role) {
      router.replace(ROLE_HOME_PATH[role]);
    }
  }, [loading, user, mustLeaveWorkspace, role, router]);

  if (loading || !user || mustLeaveWorkspace) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <>{children}</>;
}
