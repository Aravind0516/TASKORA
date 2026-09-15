"use client";

import { useEffect, useMemo, useState } from "react";
import { Archive, ArchiveRestore, CheckCircle2, FolderKanban, MoreHorizontal, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/shared/status-badge";
import { PriorityBadge } from "@/components/shared/priority-badge";
import { ProjectHealthBadge } from "@/components/shared/project-health-badge";
import { ProjectFormDialog } from "@/components/admin/project-form-dialog";
import { formatDate } from "@/lib/format";
import { calculateProjectHealth } from "@/lib/project-health";
import { usePlatform } from "@/components/platform/platform-provider";
import { useAuth } from "@/components/auth/auth-provider";
import type { PlatformProject, PlatformProjectStatus } from "@/types/platform";
import type { PlatformProjectFormValues } from "@/lib/validation/platform-project.schema";

export function AdminProjectsView() {
  const [loading, setLoading] = useState(true);
  const { currentOrganizationId, projectsInOrg, teamsInOrg, usersInOrg, tasksInProject, getUser, getTeam, createProject, updateProject, deleteProject } = usePlatform();
  const { user } = useAuth();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<PlatformProjectStatus | "all">("all");
  const [showArchived, setShowArchived] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<PlatformProject | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const allProjects = projectsInOrg(currentOrganizationId);
  const teams = teamsInOrg(currentOrganizationId);
  const users = usersInOrg(currentOrganizationId);

  useEffect(() => {
    const timeout = setTimeout(() => setLoading(false), 450);
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!successMessage) return;
    const timeout = setTimeout(() => setSuccessMessage(null), 3500);
    return () => clearTimeout(timeout);
  }, [successMessage]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allProjects.filter((p) => {
      if (p.archived !== showArchived) return false;
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (q && !`${p.name} ${p.description}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [allProjects, search, statusFilter, showArchived]);

  function openCreate() {
    setEditingProject(null);
    setFormOpen(true);
  }

  function openEdit(project: PlatformProject) {
    setEditingProject(project);
    setFormOpen(true);
  }

  function handleSubmit(values: PlatformProjectFormValues) {
    if (!currentOrganizationId || !user) return;
    const memberIds = values.memberIds ?? [];
    const managerId = values.managerId ?? null;
    const repositoryUrl = values.repositoryUrl || null;
    const workVerificationEnabled = Boolean(values.workVerificationEnabled);
    if (editingProject) {
      // Owner is intentionally excluded from this patch — it's read-only
      // once a project exists (see PROJECT OWNER fix).
      updateProject(editingProject.id, { ...values, memberIds, managerId, repositoryUrl, workVerificationEnabled, organizationId: currentOrganizationId });
      setSuccessMessage(`"${values.name}" was updated.`);
    } else {
      // ownerId is NEVER taken from the form — it's always the authenticated
      // Admin creating the project, derived from the verified Firebase
      // session (also enforced server-side by firestore.rules: a project's
      // ownerId must equal request.auth.uid on create).
      createProject({ organizationId: currentOrganizationId, ...values, memberIds, managerId, repositoryUrl, workVerificationEnabled, ownerId: user.uid });
      setSuccessMessage(`"${values.name}" was created.`);
    }
  }

  function toggleArchive(project: PlatformProject) {
    updateProject(project.id, { archived: !project.archived });
    setSuccessMessage(`"${project.name}" was ${project.archived ? "restored" : "archived"}.`);
  }

  function handleDelete(project: PlatformProject) {
    const confirmed = window.confirm(`Delete "${project.name}"? This will also delete its tasks and can't be undone.`);
    if (!confirmed) return;
    deleteProject(project.id);
    setSuccessMessage(`"${project.name}" was deleted.`);
  }

  return (
    <div>
      <PageHeader
        title="Projects"
        description="Manage every project in your organization"
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus />
            Create Project
          </Button>
        }
      />

      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search projects..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
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
        <Button variant={showArchived ? "secondary" : "outline"} size="sm" onClick={() => setShowArchived((v) => !v)}>
          {showArchived ? "Showing Archived" : "Show Archived"}
        </Button>
      </div>

      {successMessage && (
        <div className="mb-5 flex items-center gap-2 rounded-lg bg-[#0ca30c]/10 px-4 py-2.5 text-sm text-[#0ca30c]">
          <CheckCircle2 className="size-4 shrink-0" />
          {successMessage}
        </div>
      )}

      {loading ? (
        <Skeleton className="h-96 w-full rounded-xl" />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={showArchived ? Archive : FolderKanban}
          title={showArchived ? "No archived projects" : "No projects found"}
          description={showArchived ? "Archived projects will appear here." : "Create your first project to get started."}
          actionLabel={showArchived ? undefined : "Create Project"}
          onAction={showArchived ? undefined : openCreate}
        />
      ) : (
        <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Project</TableHead>
                <TableHead>Team</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Health</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((project) => {
                const team = getTeam(project.teamId);
                return (
                  <TableRow key={project.id}>
                    <TableCell className="whitespace-normal font-medium text-foreground">{project.name}</TableCell>
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
                    <TableCell>
                      <ProjectHealthBadge health={calculateProjectHealth(project, tasksInProject(project.id))} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(project.dueDate)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`Actions for ${project.name}`} />}>
                          <MoreHorizontal />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(project)}>
                            <Pencil />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toggleArchive(project)}>
                            {project.archived ? <ArchiveRestore /> : <Archive />}
                            {project.archived ? "Restore" : "Archive"}
                          </DropdownMenuItem>
                          <DropdownMenuItem variant="destructive" onClick={() => handleDelete(project)}>
                            <Trash2 />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <ProjectFormDialog
        key={editingProject?.id ?? "new"}
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmitProject={handleSubmit}
        teams={teams}
        users={users}
        project={editingProject}
        ownerName={editingProject ? (getUser(editingProject.ownerId)?.name ?? "Unknown") : (user?.displayName ?? user?.email ?? "You")}
      />
    </div>
  );
}
