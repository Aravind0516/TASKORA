import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface HeroStat {
  label: string;
  value: string;
  /** Highlights the stat in amber — e.g. overdue work. */
  attention?: boolean;
}

interface DashboardHeroProps {
  eyebrow: string;
  title: string;
  subtitle?: string;
  stats?: HeroStat[];
  actions?: ReactNode;
  className?: string;
}

/**
 * The midnight welcome banner at the top of the member and admin dashboards:
 * who/where you are, a few headline numbers, and the primary actions. Uses
 * the shared hero surface (globals.css), so both dashboards read as one product.
 */
export function DashboardHero({ eyebrow, title, subtitle, stats, actions, className }: DashboardHeroProps) {
  return (
    <section className={cn("taskora-hero-surface taskora-fade-up relative mb-6 overflow-hidden rounded-2xl shadow-(--shadow-card-hover)", className)}>
      <div aria-hidden className="taskora-grid-overlay pointer-events-none absolute inset-0" />
      <div aria-hidden className="pointer-events-none absolute -top-24 -right-16 size-72 rounded-full bg-[oklch(0.62_0.2_300/0.35)] blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />

      <div className="relative flex flex-col gap-6 px-6 py-7 sm:px-8 sm:py-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-[0.14em] text-white/60 uppercase">{eyebrow}</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">{title}</h1>
          {subtitle && <p className="mt-2 max-w-2xl text-sm text-white/70">{subtitle}</p>}
          {actions && <div className="mt-5 flex flex-wrap gap-2">{actions}</div>}
        </div>

        {stats && stats.length > 0 && (
          <dl className="grid shrink-0 grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => (
              // Label first in the DOM (valid <dl> order), shown under the number.
              <div key={stat.label} className="flex min-w-[7.5rem] flex-col-reverse rounded-xl border border-white/10 bg-white/[0.07] px-4 py-3 backdrop-blur-sm">
                <dt className="mt-0.5 text-xs text-white/60">{stat.label}</dt>
                <dd className={cn("text-2xl font-semibold tracking-tight tabular-nums", stat.attention ? "text-amber-300" : "text-white")}>{stat.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </section>
  );
}

/** Glassy secondary action for use on the hero surface. */
export const heroGhostActionClass =
  "inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/15 bg-white/[0.08] px-3.5 text-sm font-medium text-white transition-colors hover:bg-white/15 [&_svg]:size-4";

/** Bright primary action for use on the hero surface. */
export const heroPrimaryActionClass =
  "inline-flex h-9 items-center gap-1.5 rounded-lg bg-white px-3.5 text-sm font-semibold text-[oklch(0.3_0.12_270)] shadow-lg shadow-black/20 transition hover:bg-white/90 [&_svg]:size-4";
