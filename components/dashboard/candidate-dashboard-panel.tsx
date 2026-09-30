"use client";

import { useEffect, useMemo, useState } from "react";
import {
  IdCard,
  Gauge,
  Hash,
  ListChecks,
  ClipboardList,
  Rocket,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { ScrollingLeaderboardWidget } from "@/components/credits/scrolling-leaderboard-widget";
import * as userService from "@/lib/services/user.service";
import * as creditService from "@/lib/services/credit.service";
import * as dailyWorkUpdateService from "@/lib/services/daily-work-update.service";
import { calculateProfileCompletion } from "@/types/candidate";
import { CREDIT_CATEGORIES, CREDIT_CATEGORY_LABELS, DEFAULT_CREDIT_WEIGHTS, type CreditRules, type CreditTransaction, type LeaderboardEntry } from "@/types/credit";
import type { UserRecord } from "@/types/user";
import type { Project } from "@/types/project";
import type { Task } from "@/types/task";
import type { DailyWorkUpdate } from "@/types/daily-work-update";
import { rankLeaderboard } from "@/lib/credits/leaderboard";

interface CandidateDashboardPanelProps {
  uid: string;
  organizationId: string;
  projects: Project[];
  tasks: Task[];
}

function mondayOf(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1) - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * The premium "My Professional Performance Center" — shown ONLY when the
 * signed-in account's own users/{uid} document has employmentType
 * "INTERN" (set by an Admin at invite time; see lib/server/invitations.ts).
 * A pre-existing employee invited the ordinary way never sees any of this.
 * Every number here comes from real, live TASKORA data (credit ledger
 * aggregate, actual assigned tasks/projects, real Daily Work Update rows)
 * — never a static/fake placeholder, and every achievement badge below only
 * renders when the underlying condition is actually true.
 */
export function CandidateDashboardPanel({ uid, organizationId, projects, tasks }: CandidateDashboardPanelProps) {
  const [user, setUser] = useState<UserRecord | null | undefined>(undefined);
  const [rules, setRules] = useState<CreditRules | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[] | null>(null);
  const [transactions, setTransactions] = useState<CreditTransaction[] | null>(null);
  const [dailyUpdates, setDailyUpdates] = useState<DailyWorkUpdate[] | null>(null);

  useEffect(() => {
    const unsubscribe = userService.subscribeToUser(uid, setUser, () => setUser(null));
    return unsubscribe;
  }, [uid]);

  useEffect(() => {
    const unsubscribe = creditService.subscribeToCreditRules(organizationId, setRules, () => setRules(null));
    return unsubscribe;
  }, [organizationId]);

  useEffect(() => {
    const unsubscribe = creditService.subscribeToLeaderboard(organizationId, setLeaderboard, () => setLeaderboard(null));
    return unsubscribe;
  }, [organizationId]);

  useEffect(() => {
    const unsubscribe = creditService.subscribeToUserCreditTransactions(uid, setTransactions, () => setTransactions([]));
    return unsubscribe;
  }, [uid]);

  useEffect(() => {
    const unsubscribe = dailyWorkUpdateService.subscribeToMyDailyUpdates(uid, setDailyUpdates, () => setDailyUpdates([]));
    return unsubscribe;
  }, [uid]);

  const weekStart = useMemo(() => mondayOf(new Date()), []);

  if (user === undefined) {
    return (
      <div className="mb-6">
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }
  if (!user || user.employmentType !== "INTERN") return null;

  const completion = calculateProfileCompletion(user);
  const me = leaderboard?.find((entry) => entry.uid === uid) ?? null;
  // Same ranking as the leaderboard page and spotlight (lib/credits/leaderboard.ts):
  // only members active this period, tied scores share a rank. 0 = not ranked yet.
  const weeklyRank = leaderboard ? (rankLeaderboard(leaderboard, "weekly").find((r) => r.entry.uid === uid)?.rank ?? 0) : 0;
  const monthlyRank = leaderboard ? (rankLeaderboard(leaderboard, "monthly").find((r) => r.entry.uid === uid)?.rank ?? 0) : 0;

  const myTasks = tasks.filter((t) => t.assignedTo === uid);
  const myCompletedTasks = myTasks.filter((t) => t.status === "Completed");
  const myProject = projects.find((p) => p.memberIds.includes(uid)) ?? null;
  const myOverdueOrBlocked = myTasks.some((t) => t.status === "Blocked");
  const currentStatus = myOverdueOrBlocked ? "Blocked task — needs attention" : myProject ? "On track" : "Awaiting project assignment";

  const lifetimeCredits = me?.lifetimeCredits ?? 0;
  const weeklyCredits = me?.weeklyCredits ?? 0;
  const target = rules?.totalTarget ?? 500;
  const remaining = Math.max(0, target - lifetimeCredits);
  const percent = target > 0 ? Math.min(100, Math.round((lifetimeCredits / target) * 100)) : 0;

  const weights = rules?.weights ?? DEFAULT_CREDIT_WEIGHTS;
  const earnedByCategory = CREDIT_CATEGORIES.reduce<Record<string, number>>((acc, category) => {
    acc[category] = (transactions ?? []).filter((t) => t.category === category).reduce((sum, t) => sum + t.credits, 0);
    return acc;
  }, {});

  const weekUpdates = (dailyUpdates ?? []).filter((u) => new Date(u.date) >= weekStart);
  const weekCompletedTasks = myCompletedTasks.filter((t) => new Date(t.updatedAt) >= weekStart);
  const weekOnTimeTasks = weekCompletedTasks.filter((t) => new Date(t.updatedAt).getTime() <= new Date(t.dueDate).getTime());
  const onTimePercent = weekCompletedTasks.length > 0 ? Math.round((weekOnTimeTasks.length / weekCompletedTasks.length) * 100) : null;

  const highlights: string[] = [];
  if (weeklyRank > 0 && weeklyRank <= 3) highlights.push(`Top ${weeklyRank} this week`);
  if (weeklyCredits > 0) highlights.push(`+${weeklyCredits} credits this week`);
  if (weekCompletedTasks.length >= 3) highlights.push(`${weekCompletedTasks.length} tasks completed this week`);
  if (weekUpdates.length >= 5) highlights.push(`${weekUpdates.length}-day update streak`);

  return (
    <div className="mb-6 space-y-6">
      {/* Program status + performance score. The greeting itself lives in the
          dashboard hero above, so this is purely "where do I stand". */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Your program status</CardTitle>
            <CardDescription>{myProject ? `Working on ${myProject.name}` : "No project assigned yet"}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 font-medium text-primary">
                <IdCard className="size-3.5" /> {user.userId ?? "—"}
              </span>
              <span
                className={
                  currentStatus === "On track"
                    ? "inline-flex items-center gap-1.5 rounded-full bg-success/12 px-2.5 py-1 font-medium text-success"
                    : "inline-flex items-center gap-1.5 rounded-full bg-warning/15 px-2.5 py-1 font-medium text-warning-foreground dark:text-warning"
                }
              >
                <span className="size-1.5 rounded-full bg-current" aria-hidden />
                {currentStatus === "On track" ? "Active" : currentStatus}
              </span>
            </div>
            <div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Profile completion</span>
                <span className="font-semibold text-foreground">{completion.percent}%</span>
              </div>
              <Progress value={completion.percent} className="mt-1.5 h-1.5" />
            </div>
            {highlights.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {highlights.map((label) => (
                  <span key={label} className="tone-violet inline-flex items-center gap-1 rounded-full border border-border bg-surface-muted/70 px-2.5 py-1 text-xs font-medium text-foreground">
                    <span className="taskora-tone-tile size-1.5 rounded-full" aria-hidden />
                    {label}
                  </span>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden lg:col-span-3">
          <div aria-hidden className="pointer-events-none absolute -top-20 -right-20 size-64 rounded-full bg-[oklch(0.6_0.2_290/0.12)] blur-3xl" />
          <CardContent className="relative px-6 py-6">
            <p className="text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">Performance Score</p>
            <p className="mt-2 text-5xl font-semibold tracking-tight tabular-nums">
              <span className="taskora-brand-text">{lifetimeCredits}</span>{" "}
              <span className="text-xl font-medium text-muted-foreground">/ {target} credits</span>
            </p>
            <div className="mt-5 h-2.5 w-full overflow-hidden rounded-full bg-muted">
              <div className="taskora-brand-gradient h-full rounded-full transition-all duration-700" style={{ width: `${percent}%` }} />
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
              {percent >= 100 ? (
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="size-4 text-success" />
                  Target reached
                </span>
              ) : (
                <span>{remaining} credits to go to reach your target</span>
              )}
              <span className="font-semibold text-foreground">{percent}%</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard label="Weekly Rank" value={weeklyRank > 0 ? `#${weeklyRank}` : "—"} icon={Hash} tone="violet" />
        <KpiCard label="Monthly Rank" value={monthlyRank > 0 ? `#${monthlyRank}` : "—"} icon={Hash} tone="indigo" />
        <KpiCard label="Tasks Completed" value={String(myCompletedTasks.length)} icon={ListChecks} tone="emerald" />
        <KpiCard label="Daily Updates" value={dailyUpdates === null ? "—" : `${weekUpdates.length}/5`} icon={ClipboardList} tone="sky" />
        <KpiCard label="Credits This Week" value={String(weeklyCredits)} icon={Gauge} tone="amber" />
        <KpiCard label="Project Progress" value={myProject ? `${myProject.progress}%` : "—"} icon={Rocket} tone="violet" />
      </div>

      {/* Credit breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>How You Earned Your Credits</CardTitle>
          <CardDescription>Every credit comes from a verified, admin-awarded transaction</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CREDIT_CATEGORIES.map((category) => {
              const earned = earnedByCategory[category] ?? 0;
              const max = weights[category];
              return (
                <div key={category} className="rounded-xl border border-border/70 bg-surface-muted/50 p-3.5">
                  <p className="text-sm font-medium text-foreground">{CREDIT_CATEGORY_LABELS[category]}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {earned} / {max}
                  </p>
                  <Progress value={max > 0 ? Math.min(100, Math.round((earned / max) * 100)) : 0} className="mt-2 h-1.5" />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Weekly performance */}
      <Card>
        <CardHeader>
          <CardTitle>This Week</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <WeeklyStat label="Tasks Completed" value={String(weekCompletedTasks.length)} tone="tone-emerald" />
            <WeeklyStat label="Daily Updates" value={`${weekUpdates.length}/5`} tone="tone-sky" />
            <WeeklyStat label="On-Time %" value={onTimePercent === null ? "—" : `${onTimePercent}%`} tone="tone-indigo" />
            <WeeklyStat label="Credits Earned" value={String(weeklyCredits)} tone="tone-amber" />
            <WeeklyStat label="Project Progress" value={myProject ? `${myProject.progress}%` : "—"} tone="tone-violet" />
          </div>
        </CardContent>
      </Card>

      {/* Leaderboard */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ScrollingLeaderboardWidget organizationId={organizationId} uid={uid} period="weekly" />
        <ScrollingLeaderboardWidget organizationId={organizationId} uid={uid} period="monthly" />
      </div>
    </div>
  );
}

function WeeklyStat({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className={`${tone} relative overflow-hidden rounded-xl border border-border/70 bg-surface-muted/60 px-4 py-3`}>
      <span aria-hidden className="taskora-tone-tile absolute inset-y-3 left-0 w-1 rounded-r-full" />
      <p className="text-2xl font-semibold tracking-tight text-foreground tabular-nums">{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
