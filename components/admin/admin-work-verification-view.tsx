"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileCheck2, Paperclip, Search } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { usePlatform } from "@/components/platform/platform-provider";
import * as dailyWorkUpdateService from "@/lib/services/daily-work-update.service";
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
  SUBMITTED: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  VERIFIED: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  PARTIALLY_VERIFIED: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  NEEDS_CLARIFICATION: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
};

type DateFilter = "all" | "week" | "month";

/**
 * Organization-wide Work Verification — the admin-console gap the final
 * audit flagged (HIGH-2): previously this data was only reachable per
 * project (the project detail page's own "Work Verification" tab) or via a
 * manager's personal "pending reviews" dashboard card. This page reuses
 * BOTH of those exact same building blocks rather than inventing anything
 * new: dailyWorkUpdateService.subscribeToProjectDailyUpdates() (the
 * existing reviewer-only, project-scoped query — provable under
 * firestore.rules for an Admin via isAdminOfOrg(), unchanged) is simply
 * fanned out across every project in the organization, exactly like
 * components/team/team-performance-view.tsx already does for a manager's
 * own managed projects. No new collection, no new Firestore rule, no
 * duplicate data model — just an aggregation view over data an Admin was
 * already fully authorized to read.
 */
export function AdminWorkVerificationView() {
  const { currentOrganizationId, projectsInOrg, teamsInOrg, usersInOrg, getUser } = usePlatform();
  const orgId = currentOrganizationId ?? "";
  const projects = projectsInOrg(orgId);
  const teams = teamsInOrg(orgId);
  const users = usersInOrg(orgId);

  const [updatesByProject, setUpdatesByProject] = useState<Record<string, DailyWorkUpdate[]>>({});
  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [teamFilter, setTeamFilter] = useState("all");
  const [candidateFilter, setCandidateFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<DailyUpdateStatus | "all">("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");

  useEffect(() => {
    if (!orgId || projects.length === 0) return;
    const unsubscribes = projects.map((project) =>
      dailyWorkUpdateService.subscribeToProjectDailyUpdates(
        orgId,
        project.id,
        (updates) => setUpdatesByProject((prev) => ({ ...prev, [project.id]: updates })),
        () => setUpdatesByProject((prev) => ({ ...prev, [project.id]: [] }))
      )
    );
    return () => unsubscribes.forEach((fn) => fn());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, projects.map((p) => p.id).join(",")]);

  const loaded = projects.length === 0 || projects.every((p) => p.id in updatesByProject);

  // Plain computation, not useMemo — projectsInOrg()/usersInOrg() (from
  // usePlatform()) return a freshly-derived array on every call rather than
  // a stable cached reference, which would make a useMemo here recompute on
  // every render anyway (and the React Compiler correctly flags that as
  // memoization it can't actually preserve). The underlying filtering is
  // cheap client-side array work over one organization's data, so there's
  // no real cost to just computing it directly.
  function computeRows() {
    const projectsFiltered = teamFilter === "all" ? projects : projects.filter((p) => p.teamId === teamFilter);
    const relevantProjectIds = new Set(projectsFiltered.map((p) => p.id));
    const q = search.trim().toLowerCase();

    const all = projectsFiltered
      .filter((project) => projectFilter === "all" || project.id === projectFilter)
      .flatMap((project) =>
        (updatesByProject[project.id] ?? [])
          .filter((update) => relevantProjectIds.has(update.projectId))
          .map((update) => ({ update, projectName: project.name }))
      );

    const filtered = all.filter(({ update }) => {
      if (statusFilter !== "all" && update.status !== statusFilter) return false;
      if (candidateFilter !== "all" && update.userId !== candidateFilter) return false;
      if (dateFilter !== "all") {
        const days = dateFilter === "week" ? 7 : 30;
        const cutoff = new Date().getTime() - days * 24 * 60 * 60 * 1000;
        if (new Date(update.date).getTime() < cutoff) return false;
      }
      if (q) {
        const person = getUser(update.userId);
        const haystack = `${person?.name ?? ""} ${person?.userId ?? ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    return [...filtered].sort((a, b) => b.update.date.localeCompare(a.update.date));
  }
  const rows = computeRows();

  return (
    <div>
      <PageHeader title="Work Verification" description="Every Daily Work Update across your organization's projects." />

      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by name or Candidate ID..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
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
            <SelectItem value="week">Last 7 days</SelectItem>
            <SelectItem value="month">Last 30 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {!loaded ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : projects.length === 0 ? (
        <EmptyState icon={FileCheck2} title="No projects yet" description="Create a project with Work Verification enabled to see submissions here." />
      ) : rows.length === 0 ? (
        <EmptyState icon={FileCheck2} title="No updates match your filters" description="Try a different filter or search." />
      ) : (
        <Card>
          <CardContent className="px-0 py-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Candidate</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reviewer</TableHead>
                  <TableHead>Reviewer Comment</TableHead>
                  <TableHead>Evidence</TableHead>
                  <TableHead className="w-16" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.slice(0, 200).map(({ update, projectName }) => {
                  const person = getUser(update.userId);
                  const reviewer = update.reviewedBy ? getUser(update.reviewedBy) : null;
                  return (
                    <TableRow key={update.id}>
                      <TableCell>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">{person?.name ?? "Unknown"}</p>
                          <p className="truncate text-xs text-muted-foreground">{person?.userId ?? "—"}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{projectName}</TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(update.date)}</TableCell>
                      <TableCell>
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_TONE[update.status]}`}>
                          {STATUS_LABELS[update.status]}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{reviewer?.name ?? "—"}</TableCell>
                      <TableCell className="max-w-xs truncate text-muted-foreground" title={update.reviewerComment ?? undefined}>
                        {update.reviewerComment ?? "—"}
                      </TableCell>
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
                        <Link
                          href={`/projects/${update.projectId}?tab=work-verification`}
                          className="text-xs font-medium text-primary hover:underline"
                        >
                          Open
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
