"use client";

import { Award, PartyPopper, Trophy } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/components/auth/auth-provider";
import { useTopPerformers } from "@/components/credits/use-top-performers";
import { monthKey, monthLabel, weekRangeLabel, weekStartKey } from "@/lib/credits/periods";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { TopPerformer } from "@/types/top-performer";

/**
 * The organization's admin-published Weekly / Monthly Top Performer — shown on
 * every member's dashboard so the whole organization sees who was recognized.
 * Only this organization's recognitions are ever read (see useTopPerformers).
 * Renders nothing until an admin has published at least one.
 */
export function TopPerformerBanner({ organizationId, className }: { organizationId: string; className?: string }) {
  const { user } = useAuth();
  const { weekly, monthly } = useTopPerformers(organizationId);
  if (!weekly && !monthly) return null;

  return (
    <section aria-labelledby="top-performer-title" className={cn("mb-6", className)}>
      <h2 id="top-performer-title" className="mb-3 flex items-center gap-2 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
        <Award className="size-4 text-amber-500" aria-hidden />
        Top Performers
      </h2>
      <div className={cn("grid gap-4", weekly && monthly && "md:grid-cols-2")}>
        {weekly && <PerformerCard performer={weekly} currentUid={user?.uid} />}
        {monthly && <PerformerCard performer={monthly} currentUid={user?.uid} />}
      </div>
    </section>
  );
}

function periodText(performer: TopPerformer): { title: string; when: string } {
  if (performer.period === "weekly") {
    const current = performer.periodKey === weekStartKey();
    return { title: "Top Performer of the Week", when: `${current ? "This week · " : ""}${weekRangeLabel(performer.periodKey)}` };
  }
  const current = performer.periodKey === monthKey();
  return { title: "Top Performer of the Month", when: `${current ? "This month · " : ""}${monthLabel(performer.periodKey)}` };
}

function PerformerCard({ performer, currentUid }: { performer: TopPerformer; currentUid: string | undefined }) {
  const { title, when } = periodText(performer);
  const isMe = performer.userId === currentUid;

  return (
    <article className="taskora-lift relative overflow-hidden rounded-2xl border border-amber-400/40 bg-gradient-to-br from-amber-400/20 via-card to-card p-5 shadow-(--shadow-card)">
      <span aria-hidden className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-300 via-amber-500 to-orange-400" />
      <Trophy aria-hidden className="pointer-events-none absolute -top-3 -right-3 size-24 rotate-12 text-amber-400/15" />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">{title}</p>
          <p className="text-xs text-muted-foreground">{when}</p>
        </div>
        <Trophy aria-hidden className="size-5 shrink-0 text-amber-500" />
      </div>

      <div className="relative mt-4 flex items-center gap-4">
        <Avatar className="size-14 ring-4 ring-amber-400/50">
          <AvatarFallback className="bg-amber-500/20 text-lg font-bold text-amber-800 dark:text-amber-200">{initials(performer.displayName)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-xl font-semibold tracking-tight text-foreground">{performer.displayName}</p>
          {performer.headline && <p className="truncate text-sm text-muted-foreground">{performer.headline}</p>}
        </div>
      </div>

      {performer.message && (
        <blockquote className="relative mt-4 border-l-2 border-amber-400/70 pl-3 text-sm whitespace-pre-wrap text-foreground [overflow-wrap:anywhere]">
          {performer.message}
        </blockquote>
      )}

      <div className="relative mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>{performer.publishedByName ? `Recognized by ${performer.publishedByName}` : "Recognized by your admin"}</span>
        {isMe && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-1 font-semibold text-amber-800 dark:text-amber-200">
            <PartyPopper className="size-3.5" aria-hidden />
            That&apos;s you — congratulations!
          </span>
        )}
      </div>
    </article>
  );
}
