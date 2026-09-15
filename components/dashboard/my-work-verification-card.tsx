"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ClipboardList } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ReviewFeedback } from "@/components/work-verification/daily-update-panel";
import * as dailyUpdateService from "@/lib/services/daily-work-update.service";
import { formatDate } from "@/lib/format";
import type { DailyWorkUpdate } from "@/types/daily-work-update";
import type { Project } from "@/types/project";

interface MyWorkVerificationCardProps {
  uid: string;
  /** This member's own projects that have Work Verification turned on — used to show "submitted / not submitted" per project today. */
  workVerificationProjects: Project[];
}

/**
 * "Today's Work" + "Manager Feedback" — the Daily Work Update feature was
 * previously reachable only by already being on a specific project's page
 * and finding its Work Verification tab. This surfaces it on the dashboard
 * itself: whether today's update is still pending for each of the member's
 * Work-Verification-enabled projects, and the most recent review result so
 * feedback isn't something they have to go hunting for either.
 */
export function MyWorkVerificationCard({ uid, workVerificationProjects }: MyWorkVerificationCardProps) {
  const [myUpdates, setMyUpdates] = useState<DailyWorkUpdate[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const unsubscribe = dailyUpdateService.subscribeToMyDailyUpdates(
      uid,
      (data) => {
        setMyUpdates(data);
        setLoaded(true);
      },
      () => setLoaded(true)
    );
    return unsubscribe;
  }, [uid]);

  if (workVerificationProjects.length === 0) return null;

  const today = dailyUpdateService.todayDateKey();
  const mostRecentReviewed = myUpdates.find((u) => u.status !== "SUBMITTED") ?? null;
  const projectNameById = new Map(workVerificationProjects.map((p) => [p.id, p.name]));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Today&apos;s Work</CardTitle>
        <CardDescription>Daily Work Update status for your projects</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!loaded ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : (
          <ul className="divide-y divide-border">
            {workVerificationProjects.map((project) => {
              const submitted = myUpdates.some((u) => u.projectId === project.id && u.date === today);
              return (
                <li key={project.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                  <span className="min-w-0 truncate text-sm text-foreground">{project.name}</span>
                  {submitted ? (
                    <span className="inline-flex shrink-0 items-center gap-1 text-xs text-[#0ca30c]">
                      <CheckCircle2 className="size-3.5" /> Submitted
                    </span>
                  ) : (
                    <Button size="sm" variant="outline" className="shrink-0" nativeButton={false} render={<Link href={`/projects/${project.id}?tab=work-verification`} />}>
                      <ClipboardList />
                      Submit Daily Update
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {mostRecentReviewed && (
          <div className="border-t border-border pt-4">
            <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Manager Feedback — {formatDate(mostRecentReviewed.date)}
            </p>
            <ReviewFeedback update={mostRecentReviewed} />
          </div>
        )}

        {myUpdates.length > 0 && (
          <div className="border-t border-border pt-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Work History</p>
              <Link href={`/projects/${myUpdates[0].projectId}?tab=work-verification`} className="text-xs text-primary hover:underline">
                View all
              </Link>
            </div>
            <ul className="space-y-1.5">
              {myUpdates.slice(0, 5).map((u) => (
                <li key={u.id} className="flex items-center justify-between gap-3 text-xs">
                  <span className="min-w-0 truncate text-muted-foreground">
                    {formatDate(u.date)} · {projectNameById.get(u.projectId) ?? "—"}
                  </span>
                  <span className="shrink-0 text-foreground">{u.status === "SUBMITTED" ? "Pending review" : u.status.replace(/_/g, " ").toLowerCase()}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
