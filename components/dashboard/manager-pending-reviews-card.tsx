"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ClipboardCheck } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import * as dailyUpdateService from "@/lib/services/daily-work-update.service";
import type { DailyWorkUpdate } from "@/types/daily-work-update";
import type { Project } from "@/types/project";

interface ManagerPendingReviewsCardProps {
  /** Projects this signed-in member is the assigned manager of (project.managerId === their own uid) — Work Verification review is project-scoped, not an account-wide "Manager" role, so this is the exact set they're authorized to review. */
  managedProjects: Project[];
}

function ProjectPendingCount({ project }: { project: Project }) {
  const [pendingCount, setPendingCount] = useState<number | null>(null);

  useEffect(() => {
    // Only ever rendered for a project that already has the feature on (see
    // the `reviewable` filter below) — no "off" branch needed here.
    const unsubscribe = dailyUpdateService.subscribeToProjectDailyUpdates(
      project.id,
      (updates: DailyWorkUpdate[]) => setPendingCount(updates.filter((u) => u.status === "SUBMITTED").length),
      () => setPendingCount(0)
    );
    return unsubscribe;
  }, [project.id]);

  return (
    <li className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
      <span className="min-w-0 truncate text-sm text-foreground">{project.name}</span>
      <div className="flex shrink-0 items-center gap-2">
        {pendingCount !== null && pendingCount > 0 && (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{pendingCount} pending</span>
        )}
        <Button size="sm" variant="outline" nativeButton={false} render={<Link href={`/projects/${project.id}?tab=work-verification`} />}>
          Review
        </Button>
      </div>
    </li>
  );
}

/**
 * Managers here are project-scoped (projects.managerId), not a separate
 * account-wide role or shell — so "the Manager dashboard" is this same
 * Overview page with an extra section, not a different route. Surfaces
 * every project this member manages that has Work Verification on, with a
 * live pending-review count, so a manager doesn't have to remember which of
 * their projects to check.
 */
export function ManagerPendingReviewsCard({ managedProjects }: ManagerPendingReviewsCardProps) {
  const reviewable = managedProjects.filter((p) => p.workVerificationEnabled);
  if (reviewable.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Work Verification — Your Projects</CardTitle>
        <CardDescription>Daily updates awaiting your review</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="divide-y divide-border">
          {reviewable.map((project) => (
            <ProjectPendingCount key={project.id} project={project} />
          ))}
        </ul>
      </CardContent>
      <div className="px-6 pb-4">
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <ClipboardCheck className="size-3.5" />
          Open a project above, then its Work Verification tab, to verify.
        </p>
      </div>
    </Card>
  );
}
