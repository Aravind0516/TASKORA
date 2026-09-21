"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BarChart3 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import * as creditService from "@/lib/services/credit.service";
import type { LeaderboardEntry } from "@/types/credit";
import { cn } from "@/lib/utils";

interface ScrollingLeaderboardWidgetProps {
  organizationId: string;
  uid: string;
  period?: "weekly" | "monthly";
}

/**
 * Compact, auto-refreshing leaderboard for the intern dashboard — reads live
 * from the SAME leaderboardStats aggregate the full Leaderboard page uses
 * (subscribeToLeaderboard), so it updates the instant a credit is awarded,
 * never a hardcoded/static list. Shows only rank, safe display name (never a
 * full profile), and credits — nothing sensitive.
 */
export function ScrollingLeaderboardWidget({ organizationId, uid, period = "weekly" }: ScrollingLeaderboardWidgetProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = creditService.subscribeToLeaderboard(organizationId, setEntries, setError);
    return unsubscribe;
  }, [organizationId]);

  const ranked = (entries ?? [])
    .slice()
    .sort((a, b) => (period === "weekly" ? b.weeklyCredits - a.weeklyCredits : b.monthlyCredits - a.monthlyCredits))
    .slice(0, 8);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="size-4 text-muted-foreground" /> {period === "weekly" ? "Weekly" : "Monthly"} Leaderboard
          </CardTitle>
          <CardDescription>Top performers this {period === "weekly" ? "week" : "month"}</CardDescription>
        </div>
        <Button size="sm" variant="outline" nativeButton={false} render={<Link href="/leaderboard" />}>
          View all
        </Button>
      </CardHeader>
      <CardContent>
        {error ? (
          <p className="text-sm text-muted-foreground">Leaderboard unavailable right now.</p>
        ) : entries === null ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : ranked.length === 0 ? (
          <p className="text-sm text-muted-foreground">No credits awarded yet — check back soon.</p>
        ) : (
          <div className="max-h-72 space-y-1 overflow-y-auto pr-1">
            {ranked.map((entry, index) => {
              const isMe = entry.uid === uid;
              const credits = period === "weekly" ? entry.weeklyCredits : entry.monthlyCredits;
              return (
                <div
                  key={entry.uid}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-lg px-2.5 py-1.5 text-sm",
                    isMe && "bg-primary/10"
                  )}
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="w-5 shrink-0 text-center text-xs font-semibold text-muted-foreground">#{index + 1}</span>
                    <span className={cn("truncate", isMe ? "font-semibold text-primary" : "text-foreground")}>
                      {isMe ? `${entry.displayName} (You)` : entry.displayName}
                    </span>
                  </div>
                  <span className="shrink-0 text-xs font-medium text-muted-foreground">{credits} credits</span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
