"use client";

import { useEffect, useMemo, useState } from "react";
import { Users2 } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { useAuth } from "@/components/auth/auth-provider";
import { useWorkspace } from "@/components/workspace/workspace-provider";
import * as creditService from "@/lib/services/credit.service";
import * as dailyWorkUpdateService from "@/lib/services/daily-work-update.service";
import type { DailyWorkUpdate } from "@/types/daily-work-update";
import type { LeaderboardEntry } from "@/types/credit";
import { formatDate } from "@/lib/format";

/**
 * Manager-scoped "Team Performance" — deliberately built from ONLY data a
 * project manager already has legitimate access to (their own managed
 * projects' members/tasks, leaderboardStats' org-wide-safe aggregate, and
 * dailyWorkUpdates for a project they manage, which isManagerOfProject()
 * already allows) so it needs ZERO new firestore.rules. It never reaches
 * into a teammate's private identity fields (userId/college/domain/etc.,
 * admin/self-only per firestore.rules' users/{uid} block) — this is why it
 * shows a teammate's ordinary roster name, not a Candidate ID or private
 * profile field. Strictly scoped to projects this manager actually manages
 * — never an org-wide roster.
 */
export function TeamPerformanceView() {
  const { organizationId } = useAuth();
  const { uid, projects, tasks, members } = useWorkspace();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[] | null>(null);
  const [updatesByProject, setUpdatesByProject] = useState<Record<string, DailyWorkUpdate[]>>({});

  const managedProjects = useMemo(() => projects.filter((p) => p.managerId === uid), [projects, uid]);

  useEffect(() => {
    if (!organizationId) return;
    return creditService.subscribeToLeaderboard(organizationId, setLeaderboard, () => setLeaderboard(null));
  }, [organizationId]);

  useEffect(() => {
    if (!organizationId) return;
    const unsubscribes = managedProjects.map((project) =>
      dailyWorkUpdateService.subscribeToProjectDailyUpdates(
        organizationId,
        project.id,
        (updates) => setUpdatesByProject((prev) => ({ ...prev, [project.id]: updates })),
        () => setUpdatesByProject((prev) => ({ ...prev, [project.id]: [] }))
      )
    );
    return () => unsubscribes.forEach((fn) => fn());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, managedProjects.map((p) => p.id).join(",")]);

  if (managedProjects.length === 0) {
    return <EmptyState icon={Users2} title="No managed projects" description="You'll see your team's performance here once you're assigned as a project manager." />;
  }

  const rows = managedProjects.flatMap((project) => {
    const updates = updatesByProject[project.id];
    return project.memberIds
      .filter((memberId) => memberId !== project.managerId)
      .map((memberId) => {
        const member = members.find((m) => m.id === memberId);
        const memberTasks = tasks.filter((t) => t.projectId === project.id && t.assignedTo === memberId);
        const completedTasks = memberTasks.filter((t) => t.status === "Completed");
        const memberUpdates = (updates ?? []).filter((u) => u.userId === memberId).sort((a, b) => b.date.localeCompare(a.date));
        const lastUpdate = memberUpdates[0] ?? null;
        const entry = leaderboard?.find((e) => e.uid === memberId) ?? null;
        return {
          key: `${project.id}_${memberId}`,
          memberName: member?.name ?? "Unknown",
          projectName: project.name,
          taskProgress: memberTasks.length > 0 ? `${completedTasks.length}/${memberTasks.length}` : "—",
          lastUpdateDate: lastUpdate ? formatDate(lastUpdate.date) : "No updates yet",
          lastUpdateStatus: lastUpdate?.status ?? null,
          blockers: lastUpdate?.blockers || "",
          weeklyCredits: entry?.weeklyCredits ?? 0,
          monthlyCredits: entry?.monthlyCredits ?? 0,
        };
      });
  });

  return (
    <Card>
      <CardContent className="px-0 py-0">
        {leaderboard === null && Object.keys(updatesByProject).length < managedProjects.length ? (
          <div className="space-y-2 p-5">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : rows.length === 0 ? (
          <div className="py-8">
            <EmptyState icon={Users2} title="No team members yet" description="Add members to your projects to see their performance here." />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Tasks</TableHead>
                <TableHead>Last Update</TableHead>
                <TableHead>Weekly</TableHead>
                <TableHead>Monthly</TableHead>
                <TableHead>Blockers</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.key}>
                  <TableCell className="font-medium text-foreground">{row.memberName}</TableCell>
                  <TableCell className="text-muted-foreground">{row.projectName}</TableCell>
                  <TableCell>{row.taskProgress}</TableCell>
                  <TableCell className="text-muted-foreground">{row.lastUpdateDate}</TableCell>
                  <TableCell>{row.weeklyCredits} pts</TableCell>
                  <TableCell>{row.monthlyCredits} pts</TableCell>
                  <TableCell className={row.blockers ? "text-amber-600" : "text-muted-foreground"}>{row.blockers || "None"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
