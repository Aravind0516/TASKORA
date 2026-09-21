"use client";

import { useEffect, useMemo, useState } from "react";
import { MessageSquare } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/components/auth/auth-provider";
import { useWorkspace } from "@/components/workspace/workspace-provider";
import * as creditService from "@/lib/services/credit.service";
import * as dailyWorkUpdateService from "@/lib/services/daily-work-update.service";
import { DEFAULT_CREDIT_WEIGHTS, type CreditRules, type CreditTransaction, type LeaderboardEntry } from "@/types/credit";
import type { DailyWorkUpdate } from "@/types/daily-work-update";
import { formatDate } from "@/lib/format";

function mondayOf(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1) - day);
  d.setHours(0, 0, 0, 0);
  return d;
}
function monthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function MyPerformanceView() {
  const { user, organizationId } = useAuth();
  const { projects, tasks } = useWorkspace();
  const [rules, setRules] = useState<CreditRules | null>(null);
  const [leaderboardEntry, setLeaderboardEntry] = useState<LeaderboardEntry | null>(null);
  const [transactions, setTransactions] = useState<CreditTransaction[] | null>(null);
  const [dailyUpdates, setDailyUpdates] = useState<DailyWorkUpdate[] | null>(null);

  useEffect(() => {
    if (!organizationId) return;
    return creditService.subscribeToCreditRules(organizationId, setRules, () => {});
  }, [organizationId]);

  useEffect(() => {
    if (!organizationId) return;
    return creditService.subscribeToLeaderboard(
      organizationId,
      (entries) => setLeaderboardEntry(entries.find((e) => e.uid === user?.uid) ?? null),
      () => setLeaderboardEntry(null)
    );
  }, [organizationId, user]);

  useEffect(() => {
    if (!user) return;
    return creditService.subscribeToUserCreditTransactions(user.uid, setTransactions, () => setTransactions([]));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    return dailyWorkUpdateService.subscribeToMyDailyUpdates(user.uid, setDailyUpdates, () => setDailyUpdates([]));
  }, [user]);

  const uid = user?.uid ?? "";
  const weekStart = useMemo(() => mondayOf(new Date()), []);
  const monthStartDate = useMemo(() => monthStart(new Date()), []);

  const myTasks = tasks.filter((t) => t.assignedTo === uid);
  const myCompletedTasks = myTasks.filter((t) => t.status === "Completed");
  const myProjects = projects.filter((p) => p.memberIds.includes(uid));

  const weekCompleted = myCompletedTasks.filter((t) => new Date(t.updatedAt) >= weekStart);
  const monthCompleted = myCompletedTasks.filter((t) => new Date(t.updatedAt) >= monthStartDate);
  const weekUpdates = (dailyUpdates ?? []).filter((u) => new Date(u.date) >= weekStart);
  const monthUpdates = (dailyUpdates ?? []).filter((u) => new Date(u.date) >= monthStartDate);

  function onTimeRate(completed: typeof myCompletedTasks) {
    if (completed.length === 0) return null;
    const onTime = completed.filter((t) => new Date(t.updatedAt).getTime() <= new Date(t.dueDate).getTime());
    return Math.round((onTime.length / completed.length) * 100);
  }

  const target = rules?.totalTarget ?? DEFAULT_CREDIT_WEIGHTS.LINKEDIN_OFFER_LETTER + DEFAULT_CREDIT_WEIGHTS.PROJECT_SUBMISSION;
  const managerFeedback = (dailyUpdates ?? []).filter((u) => u.reviewerComment).slice(0, 10);
  const submissionHistory = (transactions ?? []).slice(0, 10);

  const loading = !user || dailyUpdates === null || transactions === null;

  return (
    <div>
      <PageHeader title="My Performance" description="Your work, credits, and manager feedback in one place." />

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Credits</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold tracking-tight text-foreground">
                {leaderboardEntry?.lifetimeCredits ?? 0} <span className="text-base text-muted-foreground">/ {rules?.totalTarget ?? target}</span>
              </p>
              <Progress
                value={rules?.totalTarget ? Math.min(100, Math.round(((leaderboardEntry?.lifetimeCredits ?? 0) / rules.totalTarget) * 100)) : 0}
                className="mt-3 h-2"
              />
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Weekly Performance</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <Stat label="Tasks Completed" value={String(weekCompleted.length)} />
                <Stat label="Daily Updates" value={`${weekUpdates.length}/5`} />
                <Stat label="On-Time %" value={onTimeRate(weekCompleted) === null ? "—" : `${onTimeRate(weekCompleted)}%`} />
                <Stat label="Credits Earned" value={String(leaderboardEntry?.weeklyCredits ?? 0)} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Monthly Performance</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <Stat label="Tasks Completed" value={String(monthCompleted.length)} />
                <Stat label="Daily Updates" value={String(monthUpdates.length)} />
                <Stat label="On-Time %" value={onTimeRate(monthCompleted) === null ? "—" : `${onTimeRate(monthCompleted)}%`} />
                <Stat label="Credits Earned" value={String(leaderboardEntry?.monthlyCredits ?? 0)} />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Project Performance</CardTitle>
            </CardHeader>
            <CardContent>
              {myProjects.length === 0 ? (
                <p className="text-sm text-muted-foreground">No projects assigned yet.</p>
              ) : (
                <div className="space-y-4">
                  {myProjects.map((project) => {
                    const projectTasks = myTasks.filter((t) => t.projectId === project.id);
                    const projectCompleted = projectTasks.filter((t) => t.status === "Completed");
                    const projectUpdates = (dailyUpdates ?? []).filter((u) => u.projectId === project.id);
                    const projectCredits = (transactions ?? [])
                      .filter((t) => t.sourceType === "PROJECT" && t.sourceId === project.id)
                      .reduce((sum, t) => sum + t.credits, 0);
                    return (
                      <div key={project.id} className="rounded-lg border border-border p-4">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-foreground">{project.name}</span>
                          <span className="text-muted-foreground">{project.progress}%</span>
                        </div>
                        <Progress value={project.progress} className="mt-2 h-1.5" />
                        <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-muted-foreground sm:grid-cols-4">
                          <span>
                            Tasks: {projectCompleted.length}/{projectTasks.length}
                          </span>
                          <span>On Time: {onTimeRate(projectCompleted) === null ? "—" : `${onTimeRate(projectCompleted)}%`}</span>
                          <span>Daily Updates: {projectUpdates.length}</span>
                          <span>Credits: {projectCredits}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Task Performance</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Stat label="Total" value={String(myTasks.length)} />
              <Stat label="Completed" value={String(myCompletedTasks.length)} />
              <Stat label="Blocked" value={String(myTasks.filter((t) => t.status === "Blocked").length)} />
              <Stat label="In Progress" value={String(myTasks.filter((t) => t.status === "In Progress").length)} />
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Daily Work Updates</CardTitle>
                <CardDescription>Most recent submissions</CardDescription>
              </CardHeader>
              <CardContent>
                {(dailyUpdates ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No updates submitted yet.</p>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {(dailyUpdates ?? []).slice(0, 8).map((u) => (
                      <li key={u.id} className="flex items-center justify-between border-b border-border pb-2 last:border-0">
                        <span className="text-foreground">{formatDate(u.date)}</span>
                        <span className="text-muted-foreground">{u.status}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Submission History</CardTitle>
                <CardDescription>Verified credit-earning submissions</CardDescription>
              </CardHeader>
              <CardContent>
                {submissionHistory.length === 0 ? (
                  <EmptyState icon={MessageSquare} title="Nothing yet" description="Verified submissions will appear here." />
                ) : (
                  <ul className="space-y-2 text-sm">
                    {submissionHistory.map((t) => (
                      <li key={t.id} className="flex items-center justify-between border-b border-border pb-2 last:border-0">
                        <span className="text-foreground">{t.action}</span>
                        <span className="text-emerald-600">+{t.credits}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Manager Feedback</CardTitle>
              <CardDescription>Comments left on your Daily Work Updates</CardDescription>
            </CardHeader>
            <CardContent>
              {managerFeedback.length === 0 ? (
                <p className="text-sm text-muted-foreground">No feedback yet.</p>
              ) : (
                <ul className="space-y-3 text-sm">
                  {managerFeedback.map((u) => (
                    <li key={u.id} className="rounded-lg bg-muted px-3.5 py-2.5">
                      <p className="text-xs text-muted-foreground">{formatDate(u.date)}</p>
                      <p className="mt-1 text-foreground">&quot;{u.reviewerComment}&quot;</p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-2xl font-semibold tracking-tight text-foreground">{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
