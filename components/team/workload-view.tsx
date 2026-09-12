"use client";

import { useMemo } from "react";
import { AlertTriangle } from "lucide-react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/shared/empty-state";
import { WorkloadBadge } from "@/components/shared/workload-badge";
import { calculateMemberWorkload, type WorkloadLevel } from "@/lib/workload";
import { initials } from "@/lib/format";
import { useWorkspace } from "@/components/workspace/workspace-provider";

const LEVEL_ORDER: Record<WorkloadLevel, number> = { OVERLOADED: 0, HIGH: 1, NORMAL: 2, LOW: 3 };

/**
 * Answers "who is overloaded, who has capacity, and where are tasks getting
 * stuck?" from data already loaded by useWorkspace() — one Firestore read
 * (the org's tasks, already subscribed for every other view) computed
 * client-side per member via lib/workload.ts, the single reusable source of
 * truth for this calculation. No separate query per member, no invasive
 * tracking — just counts of already-visible assigned/pending/blocked/
 * overdue tasks.
 */
export function WorkloadView() {
  const { members, tasks, projects, loaded, errors, retry } = useWorkspace();

  const loading = !loaded.members || !loaded.tasks;

  const rows = useMemo(
    () =>
      members
        .map((member) => calculateMemberWorkload(member.id, tasks))
        .sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level] || b.totalAssigned - a.totalAssigned),
    [members, tasks]
  );

  const activeProjectCount = projects.filter((p) => !p.archived && p.status !== "Completed").length;

  const errorMessage = errors.members ?? errors.tasks;

  if (loading) {
    return <Skeleton className="h-96 w-full rounded-xl" />;
  }
  if (errorMessage) {
    return <ErrorState message={errorMessage} onRetry={retry} />;
  }
  if (members.length === 0) {
    return <EmptyState icon={AlertTriangle} title="No team members yet" description="Workload appears once your organization has members and tasks." />;
  }

  return (
    <div>
      <p className="mb-4 text-xs text-muted-foreground">
        {activeProjectCount} active project{activeProjectCount === 1 ? "" : "s"} across the organization. Workload is derived from each member&apos;s currently assigned tasks — not a productivity score.
      </p>
      <div className="overflow-x-auto rounded-xl ring-1 ring-foreground/10">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Member</TableHead>
              <TableHead>Assigned</TableHead>
              <TableHead>Pending</TableHead>
              <TableHead>Blocked</TableHead>
              <TableHead>Overdue</TableHead>
              <TableHead>Active Projects</TableHead>
              <TableHead>Completion</TableHead>
              <TableHead>Workload</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const member = members.find((m) => m.id === row.memberId);
              if (!member) return null;
              return (
                <TableRow key={row.memberId}>
                  <TableCell>
                    <div className="flex min-w-0 items-center gap-2.5">
                      <Avatar size="sm" className="shrink-0">
                        <AvatarFallback>{initials(member.name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{member.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{member.title}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{row.totalAssigned}</TableCell>
                  <TableCell className="text-muted-foreground">{row.pending}</TableCell>
                  <TableCell className="text-muted-foreground">{row.blocked}</TableCell>
                  <TableCell className={row.overdue > 0 ? "font-medium text-destructive" : "text-muted-foreground"}>{row.overdue}</TableCell>
                  <TableCell className="text-muted-foreground">{row.activeProjects}</TableCell>
                  <TableCell className="w-32">
                    <div className="flex items-center gap-2">
                      <Progress value={row.completionPercent} className="w-16" />
                      <span className="text-xs text-muted-foreground">{row.completionPercent}%</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <WorkloadBadge level={row.level} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
