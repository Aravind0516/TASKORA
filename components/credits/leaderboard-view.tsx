"use client";

import { useMemo, useState } from "react";
import { BarChart3 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { useAuth } from "@/components/auth/auth-provider";
import { useOrgLeaderboard } from "@/components/credits/use-org-leaderboard";
import { rankLeaderboard, type LeaderboardPeriod } from "@/lib/credits/leaderboard";
import { monthKey, monthLabel, weekRangeLabel, weekStartKey } from "@/lib/credits/periods";
import { cn } from "@/lib/utils";

const PERIOD_COPY: Record<LeaderboardPeriod, { tab: string; column: string; empty: string; emptyDescription: string }> = {
  weekly: { tab: "Weekly", column: "Weekly Credits", empty: "No weekly activity yet", emptyDescription: "Rankings appear as soon as credits are awarded or adjusted this week." },
  monthly: { tab: "Monthly", column: "Monthly Credits", empty: "No monthly activity yet", emptyDescription: "Rankings appear as soon as credits are awarded or adjusted this month." },
  lifetime: { tab: "Overall", column: "Total Credits", empty: "No credits awarded yet", emptyDescription: "Once credits are awarded, rankings will appear here." },
};

export function LeaderboardView() {
  const { user, organizationId } = useAuth();
  const { entries, error } = useOrgLeaderboard(organizationId);
  const [period, setPeriod] = useState<LeaderboardPeriod>("weekly");

  const ranked = useMemo(() => rankLeaderboard(entries ?? [], period), [entries, period]);
  const me = ranked.find((row) => row.entry.uid === user?.uid);
  const periodText = period === "weekly" ? weekRangeLabel(weekStartKey()) : period === "monthly" ? monthLabel(monthKey()) : "All time";
  const copy = PERIOD_COPY[period];

  return (
    <div>
      <PageHeader title="Leaderboard" description="Your organization's members ranked by net credits — awards minus deductions." />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Tabs value={period} onValueChange={(v) => setPeriod((v as LeaderboardPeriod) ?? "weekly")}>
          <TabsList>
            {(Object.keys(PERIOD_COPY) as LeaderboardPeriod[]).map((p) => (
              <TabsTrigger key={p} value={p}>
                {PERIOD_COPY[p].tab}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <p className="text-sm text-muted-foreground">{periodText}</p>
      </div>

      {me && (
        <p className="mb-4 rounded-lg bg-primary/5 px-4 py-2.5 text-sm text-foreground">
          You&apos;re <span className="font-semibold">#{me.rank}</span> with <span className="font-semibold tabular-nums">{me.score.toLocaleString()}</span> credits
          {period === "lifetime" ? " overall." : period === "weekly" ? " this week." : " this month."}
        </p>
      )}

      <Card>
        <CardContent className="px-0 py-0">
          {!organizationId ? (
            <div className="py-8">
              <EmptyState icon={BarChart3} title="No organization selected" description="Leaderboards are organization-scoped — open one from within an organization." />
            </div>
          ) : error ? (
            <p className="px-5 py-8 text-sm text-destructive">{error}</p>
          ) : entries === null ? (
            <div className="space-y-2 p-5">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : ranked.length === 0 ? (
            <div className="py-8">
              <EmptyState icon={BarChart3} title={copy.empty} description={copy.emptyDescription} />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Rank</TableHead>
                  <TableHead>Member</TableHead>
                  <TableHead className="text-right">{copy.column}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ranked.map(({ entry, score, rank }) => {
                  const isMe = entry.uid === user?.uid;
                  return (
                    <TableRow key={entry.uid} className={cn(isMe && "bg-primary/5")}>
                      <TableCell className="font-semibold text-muted-foreground">
                        {rank === 1 && score > 0 ? <span aria-label="Rank 1">🥇</span> : `#${rank}`}
                      </TableCell>
                      <TableCell className={cn(isMe && "font-semibold text-primary")}>{isMe ? `${entry.displayName} (You)` : entry.displayName}</TableCell>
                      <TableCell className={cn("text-right tabular-nums", score < 0 && "text-danger")}>{score.toLocaleString()} credits</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
