"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, HelpCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/shared/empty-state";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { EVIDENCE_TYPE_LABELS } from "@/lib/validation/daily-work-update.schema";
import * as dailyUpdateService from "@/lib/services/daily-work-update.service";
import * as notificationService from "@/lib/services/notification.service";
import { formatDate } from "@/lib/format";
import type { DailyWorkUpdate, DailyUpdateStatus } from "@/types/daily-work-update";
import type { Task } from "@/types/task";

interface Member {
  id: string;
  name: string;
}

interface ProjectVerificationDashboardProps {
  organizationId: string;
  projectId: string;
  projectName: string;
  reviewerUid: string;
  members: Member[];
  tasks: Task[];
  updates: DailyWorkUpdate[];
  getRecipientPreferences?: (uid: string) => Record<string, boolean> | undefined;
}

export function ProjectVerificationDashboard({
  organizationId,
  projectId,
  projectName,
  reviewerUid,
  members,
  tasks,
  updates,
  getRecipientPreferences,
}: ProjectVerificationDashboardProps) {
  const today = dailyUpdateService.todayDateKey();
  const [reviewTarget, setReviewTarget] = useState<DailyWorkUpdate | null>(null);
  const [reviewChoice, setReviewChoice] = useState<Exclude<DailyUpdateStatus, "SUBMITTED"> | null>(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pendingReview = updates.filter((u) => u.status === "SUBMITTED").sort((a, b) => (a.date < b.date ? 1 : -1));

  function openReview(update: DailyWorkUpdate, choice: Exclude<DailyUpdateStatus, "SUBMITTED">) {
    setReviewTarget(update);
    setReviewChoice(choice);
    setComment("");
    setError(null);
  }

  async function submitReview() {
    if (!reviewTarget || !reviewChoice) return;
    if (reviewChoice !== "VERIFIED" && comment.trim().length === 0) {
      setError("A comment is required for Partially Verified or Needs Clarification.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await dailyUpdateService.reviewDailyUpdate(reviewTarget.id, reviewerUid, reviewChoice, comment);
      notificationService
        .notifyUsers({
          organizationId,
          actorId: reviewerUid,
          recipientIds: [reviewTarget.userId],
          type: "daily_update_reviewed",
          title: reviewChoice === "VERIFIED" ? "Update verified" : reviewChoice === "PARTIALLY_VERIFIED" ? "Update partially verified" : "Clarification requested",
          message: `Your ${formatDate(reviewTarget.date)} update on "${projectName}" was ${reviewChoice === "VERIFIED" ? "verified" : reviewChoice === "PARTIALLY_VERIFIED" ? "partially verified" : "sent back for clarification"}.`,
          href: `/projects/${projectId}`,
          getPreferences: getRecipientPreferences,
        })
        .catch((e) => console.error("ProjectVerificationDashboard: notifyUsers failed", e));
      setReviewTarget(null);
      setReviewChoice(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save your review.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Today&apos;s Status</CardTitle>
          <CardDescription>{formatDate(today)}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Member</TableHead>
                  <TableHead>Today&apos;s Update</TableHead>
                  <TableHead>Evidence</TableHead>
                  <TableHead>Review</TableHead>
                  <TableHead>Current Task</TableHead>
                  <TableHead>Progress</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => {
                  const memberTasks = tasks.filter((t) => t.assignedTo === member.id);
                  const completedCount = memberTasks.filter((t) => t.status === "Completed").length;
                  const progress = memberTasks.length > 0 ? Math.round((completedCount / memberTasks.length) * 100) : 0;
                  const currentTask = memberTasks.find((t) => t.status !== "Completed");
                  const todayUpdate = updates.find((u) => u.userId === member.id && u.date === today);
                  return (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium text-foreground">{member.name}</TableCell>
                      <TableCell>
                        {todayUpdate ? (
                          <span className="inline-flex items-center gap-1 text-success">
                            <CheckCircle2 className="size-3.5" /> Submitted
                          </span>
                        ) : (
                          <span className="text-muted-foreground">✗ Missing</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {!todayUpdate ? (
                          "—"
                        ) : todayUpdate.evidence.length > 0 ? (
                          <span className="text-success">✓ Evidence</span>
                        ) : (
                          <span className="text-amber-600 dark:text-amber-400">⚠ No evidence</span>
                        )}
                      </TableCell>
                      <TableCell>{todayUpdate ? <ReviewBadge status={todayUpdate.status} /> : "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{currentTask?.title ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{progress}%</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Needs Review ({pendingReview.length})</CardTitle>
          <CardDescription>Updates awaiting a review decision</CardDescription>
        </CardHeader>
        <CardContent>
          {pendingReview.length === 0 ? (
            <EmptyState icon={HelpCircle} title="Nothing to review" description="All submitted updates have been reviewed." />
          ) : (
            <div className="space-y-4">
              {pendingReview.map((update) => {
                const member = members.find((m) => m.id === update.userId);
                const task = update.taskId ? tasks.find((t) => t.id === update.taskId) : null;
                return (
                  <div key={update.id} className="rounded-lg border border-border p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-foreground">{member?.name ?? "Unknown"}</p>
                        <p className="text-xs text-muted-foreground">
                          {task ? task.title : "Project-level"} · {formatDate(update.date)}
                        </p>
                      </div>
                      <Badge variant="outline">SUBMITTED</Badge>
                    </div>
                    <p className="mt-3 text-sm text-foreground">{update.workSummary}</p>
                    {update.evidence.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {update.evidence.map((e, i) => (
                          <li key={i} className="text-sm">
                            <a href={e.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                              {EVIDENCE_TYPE_LABELS[e.type]}
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button size="sm" onClick={() => openReview(update, "VERIFIED")}>
                        Verify
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => openReview(update, "PARTIALLY_VERIFIED")}>
                        Partially Verify
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => openReview(update, "NEEDS_CLARIFICATION")}>
                        Needs Clarification
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={reviewTarget !== null} onOpenChange={(open) => !open && setReviewTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {reviewChoice === "VERIFIED" && "Verify update"}
              {reviewChoice === "PARTIALLY_VERIFIED" && "Partially verify update"}
              {reviewChoice === "NEEDS_CLARIFICATION" && "Request clarification"}
            </DialogTitle>
            <DialogDescription>This records your review decision and notifies the author.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="review-comment">
              Comment {reviewChoice !== "VERIFIED" && <span className="text-destructive">(required)</span>}
            </Label>
            <Textarea id="review-comment" rows={3} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Share context with the author..." />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setReviewTarget(null)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="button" onClick={submitReview} disabled={submitting}>
              {submitting ? "Saving..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ReviewBadge({ status }: { status: DailyUpdateStatus }) {
  if (status === "SUBMITTED") return <Badge variant="outline">Pending review</Badge>;
  if (status === "VERIFIED")
    return (
      <span className="inline-flex items-center gap-1 text-success">
        <CheckCircle2 className="size-3.5" /> Verified
      </span>
    );
  if (status === "PARTIALLY_VERIFIED")
    return (
      <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
        <AlertTriangle className="size-3.5" /> Partial
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
      <HelpCircle className="size-3.5" /> Clarification
    </span>
  );
}
