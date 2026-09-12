"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, FolderKanban, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProjectCard } from "@/components/projects/project-card";
import { ProjectCardSkeleton } from "@/components/projects/project-card-skeleton";
import { ProjectFilters } from "@/components/projects/project-filters";
import { ProjectFormDialog } from "@/components/projects/project-form-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { useWorkspace } from "@/components/workspace/workspace-provider";
import type { ProjectPriority, ProjectStatus } from "@/types/project";

export function ProjectDirectory() {
  const { projects, loaded, errors, retry } = useWorkspace();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ProjectStatus | "all">("all");
  const [priority, setPriority] = useState<ProjectPriority | "all">("all");
  const [formOpen, setFormOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!successMessage) return;
    const timeout = setTimeout(() => setSuccessMessage(null), 4000);
    return () => clearTimeout(timeout);
  }, [successMessage]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return projects.filter((project) => {
      if (status !== "all" && project.status !== status) return false;
      if (priority !== "all" && project.priority !== priority) return false;
      if (query) {
        const haystack = `${project.name} ${project.description}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }, [projects, search, status, priority]);

  const activeFilterCount = [search.trim() !== "", status !== "all", priority !== "all"].filter(Boolean).length;
  const loading = !loaded.projects;

  function clearFilters() {
    setSearch("");
    setStatus("all");
    setPriority("all");
  }

  return (
    <div>
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <ProjectFilters
          search={search}
          onSearchChange={setSearch}
          status={status}
          onStatusChange={setStatus}
          priority={priority}
          onPriorityChange={setPriority}
          activeCount={activeFilterCount}
          onClear={clearFilters}
        />
        <Button size="sm" className="shrink-0" onClick={() => setFormOpen(true)}>
          <Plus />
          New Project
        </Button>
      </div>

      {successMessage && (
        <div className="mb-5 flex items-center gap-2 rounded-lg bg-[#0ca30c]/10 px-4 py-2.5 text-sm text-[#0ca30c]">
          <CheckCircle2 className="size-4 shrink-0" />
          {successMessage}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <ProjectCardSkeleton key={index} />
          ))}
        </div>
      ) : errors.projects ? (
        <ErrorState message={errors.projects} onRetry={retry} />
      ) : projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No projects yet"
          description="Create your first project to start tracking work across your team."
          actionLabel="Create Project"
          onAction={() => setFormOpen(true)}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No projects found"
          description="Your current search and filter combination didn't match any projects."
          actionLabel="Clear filters"
          onAction={clearFilters}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}

      <ProjectFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSaved={(project) => setSuccessMessage(`"${project.name}" was created successfully.`)}
      />
    </div>
  );
}
