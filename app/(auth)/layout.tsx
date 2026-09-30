"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ClipboardCheck, KanbanSquare, LayoutGrid, Loader2, Sparkles, Trophy } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { resolvePostAuthPath } from "@/lib/auth-redirect";
import { AuthProductFooter } from "@/components/shared/product-branding";

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

  // Split screen on large displays: the branded panel on the left, the form
  // on the right. On phones/tablets only the form column shows, with a
  // compact brand header. /forgot-password renders its own Card, so only
  // /login and /register get the card wrapper here (no nested cards).
  return (
    <div className="grid min-h-dvh bg-background lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <AuthBrandPanel />
      <div className="relative flex flex-col items-center justify-center overflow-hidden px-4 py-10 sm:px-8">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 60% 45% at 100% 0%, color-mix(in oklch, var(--brand-secondary) 10%, transparent), transparent 70%), radial-gradient(ellipse 55% 40% at 0% 100%, color-mix(in oklch, var(--primary) 9%, transparent), transparent 70%)",
          }}
        />
        <Link href="/" className="relative mb-8 flex items-center gap-2.5 lg:hidden">
          <BrandMark />
          <div className="leading-tight">
            <p className="text-base font-bold tracking-[0.06em] text-foreground">TASKORA</p>
            <p className="text-xs text-muted-foreground">Modern Work OS</p>
          </div>
        </Link>
        {isPremiumAuthRoute ? (
          <div className="taskora-fade-up relative w-full max-w-[440px] rounded-2xl border border-border/70 bg-card/90 px-7 py-8 shadow-[0_1px_2px_oklch(0.3_0.08_264/0.06),0_30px_60px_-30px_oklch(0.3_0.1_270/0.35)] backdrop-blur-sm sm:px-9 sm:py-9">
            {children}
          </div>
        ) : (
          <div className="taskora-fade-up relative w-full max-w-sm">{children}</div>
        )}
        <div className="relative">
          <AuthProductFooter />
        </div>
      </div>
    </div>
  );
}

function BrandMark({ className = "" }: { className?: string }) {
  return (
    <div className={`taskora-brand-gradient flex size-10 shrink-0 items-center justify-center rounded-xl text-white shadow-[0_10px_24px_-8px_oklch(0.55_0.22_280/0.7),inset_0_1px_0_oklch(1_0_0/0.25)] ${className}`}>
      <LayoutGrid className="size-5" />
    </div>
  );
}

const BRAND_FEATURES = [
  { icon: KanbanSquare, title: "Projects, tasks & Kanban", text: "Plan, assign and track work across every team in real time." },
  { icon: ClipboardCheck, title: "Daily work updates", text: "Progress on tasks or whole projects, reviewed by managers." },
  { icon: Trophy, title: "Credits & recognition", text: "Leaderboards and Top Performers that celebrate great work." },
];

/** Left half of the auth screens (large displays only): brand, value, and an abstract product glimpse. */
function AuthBrandPanel() {
  return (
    <aside className="taskora-hero-surface relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between lg:px-12 lg:py-10 xl:px-16">
      <div aria-hidden className="taskora-grid-overlay pointer-events-none absolute inset-0" />
      <div aria-hidden className="pointer-events-none absolute -right-24 top-1/3 size-96 rounded-full bg-[oklch(0.6_0.22_300/0.35)] blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -left-20 -bottom-24 size-80 rounded-full bg-[oklch(0.62_0.16_220/0.25)] blur-3xl" />

      <Link href="/" className="relative flex items-center gap-3">
        <BrandMark />
        <div className="leading-tight">
          <p className="text-base font-bold tracking-[0.08em] text-white">TASKORA</p>
          <p className="text-xs text-white/60">Modern Work OS</p>
        </div>
      </Link>

      <div className="relative max-w-lg py-10">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.07] px-3 py-1 text-xs font-medium text-white/80 backdrop-blur-sm">
          <Sparkles className="size-3.5 text-amber-300" />
          Built for high-performing teams
        </span>
        <h2 className="mt-5 text-4xl leading-[1.1] font-semibold tracking-tight text-white xl:text-[2.75rem]">
          Projects, people and progress —{" "}
          <span className="bg-gradient-to-r from-[oklch(0.82_0.12_250)] via-[oklch(0.8_0.15_300)] to-[oklch(0.85_0.12_340)] bg-clip-text text-transparent">
            beautifully in sync.
          </span>
        </h2>
        <p className="mt-4 text-base text-white/70">
          One workspace for your organization&apos;s projects, tasks, daily updates and recognition.
        </p>

        <ul className="mt-8 space-y-4">
          {BRAND_FEATURES.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex items-start gap-3.5">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/[0.08] text-white backdrop-blur-sm">
                <Icon className="size-[18px]" />
              </span>
              <div>
                <p className="text-sm font-semibold text-white">{title}</p>
                <p className="text-sm text-white/60">{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <ProductGlimpse />
    </aside>
  );
}

/** Purely decorative, abstract board preview (no data) — gives the panel depth. */
function ProductGlimpse() {
  const columns = [
    { dot: "bg-sky-300", bars: ["w-4/5", "w-3/5"] },
    { dot: "bg-violet-300", bars: ["w-3/4", "w-full", "w-1/2"] },
    { dot: "bg-emerald-300", bars: ["w-2/3"] },
  ];
  return (
    <div aria-hidden className="taskora-float relative max-w-lg rounded-2xl border border-white/15 bg-white/[0.06] p-4 shadow-2xl shadow-black/30 backdrop-blur-md">
      <div className="mb-3 flex items-center gap-1.5">
        <span className="size-2 rounded-full bg-rose-300/80" />
        <span className="size-2 rounded-full bg-amber-300/80" />
        <span className="size-2 rounded-full bg-emerald-300/80" />
        <span className="ml-3 h-2 w-24 rounded-full bg-white/15" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        {columns.map((column, i) => (
          <div key={i} className="space-y-2 rounded-xl bg-white/[0.05] p-2.5">
            <div className="flex items-center gap-1.5">
              <span className={`size-1.5 rounded-full ${column.dot}`} />
              <span className="h-1.5 w-10 rounded-full bg-white/25" />
            </div>
            {column.bars.map((width, j) => (
              <div key={j} className="space-y-1.5 rounded-lg border border-white/10 bg-white/[0.07] p-2">
                <span className={`block h-1.5 rounded-full bg-white/40 ${width}`} />
                <span className="block h-1.5 w-1/2 rounded-full bg-white/15" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
