"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutGrid, Loader2 } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { resolvePostAuthPath } from "@/lib/auth-redirect";

export default function AuthLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  // /login and /register get the premium centered-card treatment below (a
  // single floating card on a very subtle brand-tinted background, Jira-
  // style — no side panel, no illustration). /forgot-password keeps the
  // original bare treatment further down unchanged: its form renders its
  // own Card, and wrapping it in another one here would nest two cards.
  // This only changes which chrome wraps {children}, never the redirect
  // logic above, which is identical for every auth route.
  const isPremiumAuthRoute = ["/login", "/register"].includes(usePathname());

  // This layout's job is "redirect away if you land on /login already
  // signed in" (e.g. a restored session, or navigating back after login) —
  // NOT to react to a sign-in that just happened via the form on this same
  // page. Those are two different events that both look like "loading went
  // false and user is now set," so this only ever acts on the FIRST such
  // resolution (initialCheckDone). On the very first load of an
  // unauthenticated visit, that first resolution has user=null and does
  // nothing. A fresh login later — a second, separate transition — is
  // deliberately left alone here: LoginForm owns that entire flow and must
  // not have it pulled out from under it by this layout unmounting
  // {children} first. Before this fix, this effect and LoginForm's own
  // post-login check raced on every login attempt, and this layout — the
  // parent — always won by rendering the loading spinner instead of
  // children, killing the role check before it could run. That was the
  // actual cause of "login appears to start but immediately redirects back."
  const [initialCheckDone, setInitialCheckDone] = useState(false);
  // Set (and stays set) only for the "already signed in, redirecting away"
  // path — kept separate from initialCheckDone so that path can keep
  // blocking {children} for its whole duration without ever blocking it
  // again afterwards for an ordinary visitor who wasn't already signed in.
  const [redirectingAway, setRedirectingAway] = useState(false);

  useEffect(() => {
    if (loading || initialCheckDone) return;
    let cancelled = false;
    // Deferred so this never calls setState synchronously inside the effect
    // body — same async pattern used everywhere else in this app.
    Promise.resolve().then(() => {
      if (cancelled) return;
      setInitialCheckDone(true);
      if (!user) return;
      setRedirectingAway(true);
      resolvePostAuthPath(user).then((path) => {
        if (!cancelled) router.replace(path);
      });
    });
    return () => {
      cancelled = true;
    };
  }, [loading, initialCheckDone, user, router]);

  // Only ever block on the ONE initial resolution (first paint / restored
  // session) or an active "already signed in, redirecting away" — never on
  // `loading` by itself afterward. Once initialCheckDone is true and we're
  // not redirecting away, {children} renders permanently: if it also
  // re-hid children on every later `loading` flicker (e.g. the brief
  // identity-resolving window right after a fresh sign-in via the form
  // below), LoginForm would unmount and remount, wiping its in-progress
  // awaitingSession state and silently dropping the role check — which is
  // exactly the bug this whole rewrite exists to fix. LoginForm shows its
  // own "Loading your account..." state for that window instead.
  if (!initialCheckDone || redirectingAway) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isPremiumAuthRoute) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-gradient-to-b from-accent to-background to-40% px-4 py-12">
        <Link href="/" className="mb-8 flex items-center gap-2.5">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <LayoutGrid className="size-5" />
          </div>
          <div className="leading-tight">
            <p className="text-base font-semibold tracking-tight text-foreground">TASKORA</p>
            <p className="text-xs text-muted-foreground">Modern Work OS</p>
          </div>
        </Link>
        <div className="w-full max-w-[400px] rounded-2xl border border-border bg-card px-7 py-8 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_24px_48px_-24px_rgba(0,0,0,0.16)] sm:px-9 sm:py-9">
          {children}
        </div>
        <p className="mt-8 text-xs text-muted-foreground">© TASKORA. All rights reserved.</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-background px-4 py-12">
      <Link href="/" className="flex items-center gap-2.5">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <LayoutGrid className="size-5" />
        </div>
        <div className="leading-tight">
          <p className="text-base font-semibold tracking-tight text-foreground">TASKORA</p>
          <p className="text-xs text-muted-foreground">Workflow Platform</p>
        </div>
      </Link>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
