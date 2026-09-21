"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart3 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { useAuth } from "@/components/auth/auth-provider";
import * as creditService from "@/lib/services/credit.service";
import type { LeaderboardEntry } from "@/types/credit";
import { cn } from "@/lib/utils";

type Period = "weekly" | "monthly";

export function LeaderboardView() {
  const { user, organizationId } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>("weekly");

  useEffect(() => {
    if (!organizationId) return;
    return creditService.subscribeToLeaderboard(organizationId, setEntries, setError);
  }, [organizationId]);

  const ranked = useMemo(
    () =>
      (entries ?? [])
        .slice()
        .sort((a, b) => (period === "weekly" ? b.weeklyCredits - a.weeklyCredits : b.monthlyCredits - a.monthlyCredits)),
    [entries, period]
  );

  return (
    <div>
      <PageHeader title="Leaderboard" description="Intern performance leaderboard — ranked by credits earned this period." />

      <Tabs value={period} onValueChange={(v) => setPeriod((v as Period) ?? "weekly")} className="mb-4">
        <TabsList>
          <TabsTrigger value="weekly">Weekly</TabsTrigger>
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardContent className="px-0 py-0">
          {error ? (
            <p className="px-5 py-8 text-sm text-destructive">{error}</p>
          ) : entries === null ? (
            <div className="space-y-2 p-5">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : ranked.length === 0 ? (
            <div className="py-8">
              <EmptyState icon={BarChart3} title="No credits awarded yet" description="Once credits are awarded, rankings will appear here." />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Rank</TableHead>
                  <TableHead>Candidate</TableHead>
                  <TableHead>{period === "weekly" ? "Weekly Credits" : "Monthly Credits"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ranked.map((entry, index) => {
                  const isMe = entry.uid === user?.uid;
                  const credits = period === "weekly" ? entry.weeklyCredits : entry.monthlyCredits;
                  return (
                    <TableRow key={entry.uid} className={cn(isMe && "bg-primary/5")}>
                      <TableCell className="font-semibold text-muted-foreground">#{index + 1}</TableCell>
                      <TableCell className={cn(isMe && "font-semibold text-primary")}>
                        {isMe ? `${entry.displayName} (You)` : entry.displayName}
                      </TableCell>
                      <TableCell>{credits} credits</TableCell>
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
