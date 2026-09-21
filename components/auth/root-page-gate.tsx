"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { ROLE_HOME_PATH } from "@/lib/platform/constants";

/**
 * Wraps the public landing page (app/page.tsx) so an ALREADY-authenticated
 * visitor who opens "/" directly (a persisted session from a previous
 * visit, a bookmark, typing the bare domain) lands on their own dashboard
 * instead of the marketing page — "/" itself never had any auth awareness
 * before this, which is the actual root cause of "I log in but end up on
 * the normal/root experience": nothing was ever wrong with role resolution
 * or the login form's own post-submit redirect (see components/auth/
 * login-form.tsx, which already waits for a fully-resolved role before
 * navigating) — "/" simply never checked auth at all.
 *
 * While auth is still resolving (loading === true — normally near-instant,
 * since Firebase restores a persisted session from IndexedDB), this shows a
 * brief branded loading state instead of the landing page, so an
 * authenticated visitor never sees a flash of the marketing page before
 * being redirected away, and an unauthenticated visitor never sees a
 * flicker of a loading spinner they didn't need. No timers, no reloads —
 * purely driven by AuthProvider's own resolved state.
 */
export function RootPageGate({ children }: { children: ReactNode }) {
  const { user, role, loading } = useAuth();
  const router = useRouter();

  const authenticated = !loading && !!user;

  useEffect(() => {
    if (!authenticated || !role) return;
    router.replace(ROLE_HOME_PATH[role]);
  }, [authenticated, role, router]);

  if (loading) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Authenticated: the effect above is already navigating away — render the
  // same loading state rather than a flash of the landing page underneath.
  if (authenticated) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <>{children}</>;
}
