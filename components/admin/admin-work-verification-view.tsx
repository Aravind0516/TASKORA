"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertCircle, FileCheck2, Paperclip, Search } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { EvidenceFileLink } from "@/components/work-verification/daily-update-panel";
import { EVIDENCE_TYPE_LABELS } from "@/lib/validation/daily-work-update.schema";
import { usePlatform } from "@/components/platform/platform-provider";
import { useAuth } from "@/components/auth/auth-provider";
import * as dailyWorkUpdateService from "@/lib/services/daily-work-update.service";
import * as notificationService from "@/lib/services/notification.service";
import type { DailyWorkUpdate, DailyUpdateStatus } from "@/types/daily-work-update";
import { formatDate } from "@/lib/format";

const STATUS_OPTIONS: DailyUpdateStatus[] = ["SUBMITTED", "VERIFIED", "PARTIALLY_VERIFIED", "NEEDS_CLARIFICATION"];
const STATUS_LABELS: Record<DailyUpdateStatus, string> = {
  SUBMITTED: "Submitted",
  VERIFIED: "Verified",
  PARTIALLY_VERIFIED: "Partially Verified",
  NEEDS_CLARIFICATION: "Needs Clarification",
};
const STATUS_TONE: Record<DailyUpdateStatus, string> = {
  SUBMITTED: "bg-info/10 text-info",
  VERIFIED: "bg-success/10 text-success",
  // Amber/orange keep their existing Tailwind pairs rather than semantic
  // tokens — see components/shared/status-badge.tsx's comment on why
  // bg-warning/10 + text-warning-foreground fails contrast in dark mode.
  PARTIALLY_VERIFIED: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  NEEDS_CLARIFICATION: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
};

type DateFilter = "all" | "today" | "yesterday" | "week";

function dateKey(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Organization-wide Daily Work Update center — the Admin's single view of
 * every submission across every project, upgraded from the original
 * per-project-fan-out implementation to one indexed org-wide query
 * (subscribeToOrgDailyUpdates — see its doc comment for why that's both
 * more efficient AND admin-only), plus in-place update details + review
 * actions so the Admin no longer has to leave this page to review a
 * submission. Reuses the exact same review service call
 * (dailyUpdateService.reviewDailyUpdate) and notification type
 * ("daily_update_reviewed") as the project-level ProjectVerificationDashboard
 * — no second review pathway, no duplicate data model.
 */
export function AdminWorkVerificationView() {
  const { currentOrganizationId, projectsInOrg, teamsInOrg, usersInOrg, tasksInOrg, getUser } = usePlatform();
  const { user } = useAuth();
  const orgId = currentOrganizationId ?? "";
  const projects = projectsInOrg(orgId);
  const teams = teamsInOrg(orgId);
  const users = usersInOrg(orgId);
  const tasks = tasksInOrg(orgId);

  const searchParams = useSearchParams();
  const [updates, setUpdates] = useState<DailyWorkUpdate[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [teamFilter, setTeamFilter] = useState("all");
  const [candidateFilter, setCandidateFilter] = useState("all");
  // Lazy-initialized from ?status=/?date= so a KPI card on the Admin
  // Dashboard can link straight into a pre-filtered view (e.g.
  // /admin/work-verification?status=SUBMITTED&date=today) instead of
  // dumping the Admin on an unfiltered table they have to re-filter by hand.
  const [statusFilter, setStatusFilter] = useState<DailyUpdateStatus | "all">(() => {
    const fromUrl = searchParams.get("status");
    return fromUrl && STATUS_OPTIONS.includes(fromUrl as DailyUpdateStatus) ? (fromUrl as DailyUpdateStatus) : "all";
  });
  const [dateFilter, setDateFilter] = useState<DateFilter>(() => {
    const fromUrl = searchParams.get("date");
    return fromUrl === "today" || fromUrl === "yesterday" || fromUrl === "week" ? fromUrl : "all";
  });
  const [detailTarget, setDetailTarget] = useState<DailyWorkUpdate | null>(null);
  const [reviewChoice, setReviewChoice] = useState<Exclude<DailyUpdateStatus, "SUBMITTED"> | null>(null);
  const [comment, setComment] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId) return;
    return dailyWorkUpdateService.subscribeToOrgDailyUpdates(
      orgId,
      setUpdates,
      (message) => {
        setError(message);
        setUpdates([]);
      }
    );
  }, [orgId, retryKey]);

  const projectNameById = new Map(projects.map((p) => [p.id, p.name]));
  const taskById = new Map(tasks.map((t) => [t.id, t]));

  function computeRows() {
    if (!updates) return [];
    const projectsFiltered = teamFilter === "all" ? projects : projects.filter((p) => p.teamId === teamFilter);
    const relevantProjectIds = new Set(projectsFiltered.map((p) => p.id));
    const q = search.trim().toLowerCase();
    const todayKey = dateKey(0);
    const yesterdayKey = dateKey(1);
    const weekCutoff = dateKey(7);

    return updates
      .filter((update) => relevantProjectIds.has(update.projectId))
      .filter((update) => projectFilter === "all" || update.projectId === projectFilter)
      .filter((update) => statusFilter === "all" || update.status === statusFilter)
      .filter((update) => candidateFilter === "all" || update.userId === candidateFilter)
      .filter((update) => {
        if (dateFilter === "today") return update.date === todayKey;
        if (dateFilter === "yesterday") return update.date === yesterdayKey;
        if (dateFilter === "week") return update.date >= weekCutoff;
        return true;
      })
      .filter((update) => {
        if (!q) return true;
        const person = getUser(update.userId);
        const projectName = projectNameById.get(update.projectId) ?? "";
        const taskTitle = update.taskId ? (taskById.get(update.taskId)?.title ?? "") : "";
        const haystack = `${person?.name ?? ""} ${person?.userId ?? ""} ${projectName} ${taskTitle}`.toLowerCase();
        return haystack.includes(q);
      })
      // Sort by the real submission INSTANT (submittedAt), not the coarser
      // calendar-day `date` field — two updates on the same day (different
      // projects/tasks) must still order by actual submission time, so the
      // most-recently-submitted one is always shown first.
      .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  }
  const rows = computeRows();

  const loading = updates === null;

  function openDetail(update: DailyWorkUpdate) {
    setDetailTarget(update);
    setReviewChoice(null);
    setComment("");
    setReviewError(null);
  }

  function closeDetail() {
    setDetailTarget(null);
    setReviewChoice(null);
    setComment("");
    setReviewError(null);
  }

  async function submitReview() {
    if (!detailTarget || !reviewChoice || !user || !orgId) return;
    if (reviewChoice !== "VERIFIED" && comment.trim().length === 0) {
      setReviewError("A comment is required for Partially Verified or Needs Clarification.");
      return;
    }
    setReviewSubmitting(true);
    setReviewError(null);
    try {
      await dailyWorkUpdateService.reviewDailyUpdate(detailTarget.id, user.uid, reviewChoice, comment);
      const projectName = projectNameById.get(detailTarget.projectId) ?? "this project";
      notificationService
        .notifyUsers({
          organizationId: orgId,
          actorId: user.uid,
          recipientIds: [detailTarget.userId],
          type: "daily_update_reviewed",
          title:
            reviewChoice === "VERIFIED"
              ? "Update verified"
              : reviewChoice === "PARTIALLY_VERIFIED"
                ? "Update partially verified"
                : "Clarification requested",
          message: `Your ${formatDate(detailTarget.date)} update on "${projectName}" was ${
            reviewChoice === "VERIFIED" ? "verified" : reviewChoice === "PARTIALLY_VERIFIED" ? "partially verified" : "sent back for clarification"
          }.`,
          href: `/projects/${detailTarget.projectId}?tab=work-verification`,
          getPreferences: (uid) => getUser(uid)?.notificationPreferences,
        })
        .catch((e) => console.error("AdminWorkVerificationView: notifyUsers failed", e));
      closeDetail();
    } catch (e) {
      setReviewError(e instanceof Error ? e.message : "Failed to save your review.");
    } finally {
      setReviewSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader title="Work Verification" description="Every Daily Work Update across your organization's projects." />

      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, Candidate ID, project, or task..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={projectFilter} onValueChange={(v) => setProjectFilter(v ?? "all")}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Project" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All projects</SelectItem>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={teamFilter} onValueChange={(v) => setTeamFilter(v ?? "all")}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Team" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All teams</SelectItem>
            {teams.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={candidateFilter} onValueChange={(v) => setCandidateFilter(v ?? "all")}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Candidate" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All candidates</SelectItem>
            {users.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter((v ?? "all") as DailyUpdateStatus | "all")}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={dateFilter} onValueChange={(v) => setDateFilter((v ?? "all") as DateFilter)}>
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder="Date" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All time</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="yesterday">Yesterday</SelectItem>
            <SelectItem value="week">This week</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-2">
          <p className="mb-2 text-sm text-muted-foreground">Loading daily work updates...</p>
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={() => setRetryKey((k) => k + 1)} />
      ) : projects.length === 0 ? (
        <EmptyState icon={FileCheck2} title="No projects yet" description="Create a project with Work Verification enabled to see submissions here." />
      ) : updates && updates.length === 0 ? (
        <EmptyState icon={FileCheck2} title="No daily work updates have been submitted yet." description="Submissions will appear here as soon as an assigned member submits one." />
      ) : rows.length === 0 ? (
        <EmptyState icon={Search} title="No updates match your filters" description="Try a different filter or search." />
      ) : (
        <Card>
          <CardContent className="px-0 py-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Candidate</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Task</TableHead>
                    <TableHead>Project Status</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Review Status</TableHead>
                    <TableHead>Reviewer</TableHead>
                    <TableHead>Evidence</TableHead>
                    <TableHead className="w-16" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.slice(0, 200).map((update) => {
                    const person = getUser(update.userId);
                    const reviewer = update.reviewedBy ? getUser(update.reviewedBy) : null;
                    const task = update.taskId ? taskById.get(update.taskId) : null;
                    return (
                      <TableRow key={update.id} className="cursor-pointer" onClick={() => openDetail(update)}>
                        <TableCell>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-foreground">{person?.name ?? "Unknown"}</p>
                            <p className="truncate text-xs text-muted-foreground">{person?.userId ?? "—"}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{projectNameById.get(update.projectId) ?? "Unknown project"}</TableCell>
                        <TableCell className="text-muted-foreground">{task?.title ?? "Project-level"}</TableCell>
                        <TableCell className="text-muted-foreground">{update.projectStatus ?? "—"}</TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {formatDate(update.submittedAt, { hour: "numeric", minute: "2-digit" })}
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_TONE[update.status]}`}>
                            {STATUS_LABELS[update.status]}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{reviewer?.name ?? "—"}</TableCell>
                        <TableCell>
                          {update.evidence.length > 0 ? (
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                              <Paperclip className="size-3.5" /> {update.evidence.length}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); openDetail(update); }}>
                            Open
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={detailTarget !== null} onOpenChange={(open) => !open && closeDetail()}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          {detailTarget && (
            <>
              <DialogHeader>
                <DialogTitle>Daily Work Update</DialogTitle>
                <DialogDescription>
                  {getUser(detailTarget.userId)?.name ?? "Unknown"}
                  {getUser(detailTarget.userId)?.userId ? ` · ${getUser(detailTarget.userId)?.userId}` : ""} ·{" "}
                  {projectNameById.get(detailTarget.projectId) ?? "Unknown project"}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-3 rounded-lg border border-border p-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Task</p>
                    <p className="text-foreground">
                      {detailTarget.taskId ? (taskById.get(detailTarget.taskId)?.title ?? "Unknown task") : "Project-level"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Submitted</p>
                    <p className="text-foreground">{formatDate(detailTarget.submittedAt, { hour: "numeric", minute: "2-digit" })}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Project Status</p>
                    <p className="text-foreground">{detailTarget.projectStatus ?? "—"}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Work Summary</p>
                  <p className="mt-1 whitespace-pre-wrap text-foreground">{detailTarget.workSummary}</p>
                </div>
                <div>
                  <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Completed Work</p>
                  <p className="mt-1 whitespace-pre-wrap text-foreground">{detailTarget.completedWork}</p>
                </div>
                {detailTarget.blockers && (
                  <div>
                    <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Blockers</p>
                    <p className="mt-1 whitespace-pre-wrap text-foreground">{detailTarget.blockers}</p>
                  </div>
                )}
                {detailTarget.tomorrowPlan && (
                  <div>
                    <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Tomorrow&apos;s Plan</p>
                    <p className="mt-1 whitespace-pre-wrap text-foreground">{detailTarget.tomorrowPlan}</p>
                  </div>
                )}
                {detailTarget.evidence.length > 0 && (
                  <div>
                    <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Evidence</p>
                    <ul className="mt-1 space-y-1">
                      {detailTarget.evidence.map((ev, i) => (
                        <li key={i} className="text-sm">
                          {ev.attachmentId ? (
                            <EvidenceFileLink
                              organizationId={detailTarget.organizationId}
                              projectId={detailTarget.projectId}
                              attachmentId={ev.attachmentId}
                              fileName={ev.fileName}
                              label={EVIDENCE_TYPE_LABELS[ev.type]}
                            />
                          ) : (
                            <a href={ev.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                              {EVIDENCE_TYPE_LABELS[ev.type]}
                            </a>
                          )}
                          {ev.description && <span className="text-muted-foreground"> — {ev.description}</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="rounded-lg border border-border p-3.5">
                  <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Review</p>
                  <span className={`mt-1.5 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_TONE[detailTarget.status]}`}>
                    {STATUS_LABELS[detailTarget.status]}
                  </span>
                  {detailTarget.reviewedBy && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Reviewer: {getUser(detailTarget.reviewedBy)?.name ?? "Unknown"}
                      {detailTarget.reviewedAt ? ` · ${formatDate(detailTarget.reviewedAt)}` : ""}
                    </p>
                  )}
                  {detailTarget.reviewerComment && (
                    <p className="mt-2 text-foreground">&quot;{detailTarget.reviewerComment}&quot;</p>
                  )}

                  {detailTarget.status === "SUBMITTED" && (
                    <div className="mt-3 space-y-3">
                      {reviewChoice === null ? (
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" onClick={() => setReviewChoice("VERIFIED")}>
                            Verify
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setReviewChoice("PARTIALLY_VERIFIED")}>
                            Partially Verify
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setReviewChoice("NEEDS_CLARIFICATION")}>
                            Needs Clarification
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Label htmlFor="admin-review-comment">
                            Comment {reviewChoice !== "VERIFIED" && <span className="text-destructive">(required)</span>}
                          </Label>
                          <Textarea
                            id="admin-review-comment"
                            rows={3}
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="Share context with the author..."
                          />
                          {reviewError && (
                            <div className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
                              <AlertCircle className="mt-0.5 size-4 shrink-0" />
                              <span>{reviewError}</span>
                            </div>
                          )}
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => { setReviewChoice(null); setReviewError(null); }} disabled={reviewSubmitting}>
                              Back
                            </Button>
                            <Button size="sm" onClick={submitReview} disabled={reviewSubmitting}>
                              {reviewSubmitting ? "Saving..." : `Confirm ${STATUS_LABELS[reviewChoice]}`}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeDetail}>
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export { STATUS_LABELS as WORK_VERIFICATION_STATUS_LABELS, STATUS_TONE as WORK_VERIFICATION_STATUS_TONE, dateKey as workVerificationDateKey };
export type { DateFilter as WorkVerificationDateFilter };
