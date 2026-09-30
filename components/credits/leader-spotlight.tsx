"use client";

import Link from "next/link";
import { ArrowRight, Trophy } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/components/auth/auth-provider";
import { useShellHref } from "@/components/layout/use-shell-href";
import { useOrgLeaderboard } from "@/components/credits/use-org-leaderboard";
import { periodLeaders, type LeaderboardPeriod } from "@/lib/credits/leaderboard";
import { monthKey, monthLabel, weekRangeLabel, weekStartKey } from "@/lib/credits/periods";
import { initials } from "@/lib/format";
import type { LeaderboardEntry } from "@/types/credit";

/**
 * Dashboard spotlight: this organization's Weekly and Monthly Leader — the
 * member with the highest NET credits (awards minus deductions) in the
 * current week / month of the organization's time zone. Reads only the
 * viewer's own organization's leaderboard aggregate (see useOrgLeaderboard),
 * so another organization's leaders can never appear here.
 */
export function LeaderSpotlight({ organizationId, className = "mb-6" }: { organizationId: string; className?: string }) {
  const { user } = useAuth();
  const shellHref = useShellHref();
  const { entries, error } = useOrgLeaderboard(organizationId);

  return (
    <Card className={className} aria-labelledby="leader-spotlight-title">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-x-3 gap-y-1 space-y-0">
        <CardTitle id="leader-spotlight-title" className="flex items-center gap-2 text-base">
          <Trophy className="size-4 text-amber-500" aria-hidden />
          AI FUTURE TECH PROGRAM BY NxtWise
        </CardTitle>
        <Link href={shellHref("/leaderboard")} className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
          View full leaderboard
          <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      </CardHeader>
      <CardContent>
        {error ? (
          <p className="text-sm text-muted-foreground">The leaderboard is unavailable right now.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <LeaderTile entries={entries} period="weekly" label="Weekly Leader" periodText={weekRangeLabel(weekStartKey())} emptyText="No weekly activity yet" currentUid={user?.uid} />
            <LeaderTile entries={entries} period="monthly" label="Monthly Leader" periodText={monthLabel(monthKey())} emptyText="No monthly activity yet" currentUid={user?.uid} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function LeaderTile({
  entries,
  period,
  label,
  periodText,
  emptyText,
  currentUid,
}: {
  entries: LeaderboardEntry[] | null;
  period: LeaderboardPeriod;
  label: string;
  periodText: string;
  emptyText: string;
  currentUid: string | undefined;
}) {
  const leaders = entries ? periodLeaders(entries, period) : [];
  const leader = leaders[0];

  return (
    <section className="rounded-xl border border-border bg-gradient-to-br from-amber-500/5 to-transparent p-4" aria-label={`${label}, ${periodText}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{label}</p>
        <p className="text-xs text-muted-foreground">{periodText}</p>
      </div>
      {entries === null ? (
        <div className="mt-3 flex items-center gap-3">
          <Skeleton className="size-10 rounded-full" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      ) : !leader ? (
        <p className="mt-3 py-2 text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <div className="mt-3 flex items-center gap-3">
          <Avatar className="size-10 ring-2 ring-amber-400/60">
            <AvatarFallback className="bg-amber-500/15 font-semibold text-amber-700 dark:text-amber-300">{initials(leader.entry.displayName)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-foreground">
              <span aria-hidden>🥇 </span>
              {leader.entry.displayName}
              {leader.entry.uid === currentUid && <span className="ml-1.5 text-xs font-medium text-primary">(You)</span>}
            </p>
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground tabular-nums">{leader.score.toLocaleString()}</span> credits
              {leaders.length > 1 && <span> · tied with {leaders.length - 1} other{leaders.length > 2 ? "s" : ""}</span>}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
