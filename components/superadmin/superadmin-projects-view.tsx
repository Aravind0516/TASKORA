"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, FolderKanban, ListChecks, Search } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
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
import { StatusBadge } from "@/components/shared/status-badge";
import { PriorityBadge } from "@/components/shared/priority-badge";
import { formatDate, isOverdue } from "@/lib/format";
import { usePlatform } from "@/components/platform/platform-provider";
import type { PlatformProjectStatus } from "@/types/platform";

export function SuperAdminProjectsView() {
  const [loading, setLoading] = useState(true);
  const { projects, organizations, getOrganization, getTeam, getUser, tasksInProject } = usePlatform();

  const [search, setSearch] = useState("");
  const [orgFilter, setOrgFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<PlatformProjectStatus | "all">("all");

  useEffect(() => {
    const timeout = setTimeout(() => setLoading(false), 450);
    return () => clearTimeout(timeout);
  }, []);

  const activeProjects = projects.filter((p) => p.status === "Active");
  const completedProjects = projects.filter((p) => p.status === "Completed");
  const overdueProjects = projects.filter((p) => isOverdue(p.dueDate, p.status === "Completed"));
  const atRiskProjects = projects.filter((p) => p.status === "Active" && p.progress < 40);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return projects.filter((p) => {
      if (orgFilter !== "all" && p.organizationId !== orgFilter) return false;
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (q && !p.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [projects, search, orgFilter, statusFilter]);

  if (loading) {
    return (
      <div>
        <PageHeader title="Projects" description="Every project across every organization" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Projects" description="Every project across every organization on the platform" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard label="Total Projects" value={String(projects.length)} icon={FolderKanban} />
        <KpiCard label="Active" value={String(activeProjects.length)} icon={ListChecks} />
        <KpiCard label="Completed" value={String(completedProjects.length)} icon={CheckCircle2} />
        <KpiCard label="Overdue" value={String(overdueProjects.length)} icon={AlertTriangle} accent={overdueProjects.length > 0 ? "critical" : "default"} />
        <KpiCard label="At Risk" value={String(atRiskProjects.length)} icon={AlertTriangle} accent={atRiskProjects.length > 0 ? "critical" : "default"} />
      </div>

      <div className="mt-6 mb-5 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search projects..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={orgFilter} onValueChange={(v) => setOrgFilter(v ?? "all")}>
          <SelectTrigger className="w-full sm:w-52">
            <SelectValue placeholder="Organization" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All organizations</SelectItem>
            {organizations.map((org) => (
              <SelectItem key={org.id} value={org.id}>
                {org.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter((v ?? "all") as PlatformProjectStatus | "all")}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="Planning">Planning</SelectItem>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="On Hold">On Hold</SelectItem>
            <SelectItem value="Completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={FolderKanban} title="No projects found" description="Try a different search or filter." />
      ) : (
        <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Project</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Team</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Due Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((project) => {
                const org = getOrganization(project.organizationId);
                const team = getTeam(project.teamId);
                const owner = getUser(project.ownerId);
                const taskCount = tasksInProject(project.id).length;
                return (
                  <TableRow key={project.id}>
                    <TableCell className="whitespace-normal font-medium text-foreground">
                      {project.name}
                      <p className="text-xs font-normal text-muted-foreground">{taskCount} tasks</p>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{org?.name ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{owner?.name ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{team?.name ?? "—"}</TableCell>
                    <TableCell className="w-32">
                      <div className="flex items-center gap-2">
                        <Progress value={project.progress} className="w-16" />
                        <span className="text-xs text-muted-foreground">{project.progress}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <PriorityBadge priority={project.priority} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={project.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(project.dueDate)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
