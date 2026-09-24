"use client";

import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { selectItems } from "@/lib/select-items";
import type { Project } from "@/types/project";
import type { TaskPriority } from "@/types/task";

export type KanbanAssigneeFilter = "all" | "me" | "unassigned";

export interface KanbanFilters {
  search: string;
  projectId: string;
  priority: TaskPriority | "all";
  assignee: KanbanAssigneeFilter;
}

export const EMPTY_KANBAN_FILTERS: KanbanFilters = { search: "", projectId: "all", priority: "all", assignee: "all" };

const PRIORITIES: TaskPriority[] = ["Low", "Medium", "High", "Critical"];
const ASSIGNEE_LABELS: Record<KanbanAssigneeFilter, string> = { all: "All assignees", me: "Assigned to me", unassigned: "Unassigned" };

/**
 * Two-tier toolbar: search owns the first row on its own; filters sit on a
 * second row that wraps on tablet and stacks full-width on mobile — so the
 * search field can never be squeezed by, or overlap, the filter controls.
 * Display-only: it narrows which cards render, never how status changes work.
 */
export function KanbanToolbar({
  filters,
  onChange,
  projects,
  visibleCount,
  totalCount,
}: {
  filters: KanbanFilters;
  onChange: (next: KanbanFilters) => void;
  projects: Project[];
  visibleCount: number;
  totalCount: number;
}) {
  const activeCount = [filters.search.trim() !== "", filters.projectId !== "all", filters.priority !== "all", filters.assignee !== "all"].filter(Boolean).length;

  return (
    <div className="mb-5 space-y-3">
      <div className="relative w-full max-w-xl">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          aria-label="Search tasks on the board"
          placeholder="Search tasks..."
          className="pl-9"
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
        />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <Select
          value={filters.projectId}
          onValueChange={(value) => onChange({ ...filters, projectId: value ?? "all" })}
          items={selectItems(projects, (p) => p.id, (p) => p.name, { extra: { all: "All projects" } })}
        >
          <SelectTrigger className="w-full sm:w-52" aria-label="Filter by project">
            <SelectValue placeholder="Project" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All projects</SelectItem>
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.priority}
          onValueChange={(value) => onChange({ ...filters, priority: (value ?? "all") as TaskPriority | "all" })}
          items={{ all: "All priorities", ...Object.fromEntries(PRIORITIES.map((p) => [p, p])) }}
        >
          <SelectTrigger className="w-full sm:w-40" aria-label="Filter by priority">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            {PRIORITIES.map((priority) => (
              <SelectItem key={priority} value={priority}>
                {priority}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.assignee}
          onValueChange={(value) => onChange({ ...filters, assignee: (value ?? "all") as KanbanAssigneeFilter })}
          items={ASSIGNEE_LABELS}
        >
          <SelectTrigger className="w-full sm:w-44" aria-label="Filter by assignee">
            <SelectValue placeholder="Assignee" />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(ASSIGNEE_LABELS) as KanbanAssigneeFilter[]).map((key) => (
              <SelectItem key={key} value={key}>
                {ASSIGNEE_LABELS[key]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2 sm:ml-auto">
          <span className="text-xs text-muted-foreground" aria-live="polite">
            {activeCount > 0 ? `${visibleCount} of ${totalCount} tasks` : `${totalCount} tasks`}
          </span>
          {activeCount > 0 && (
            <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => onChange(EMPTY_KANBAN_FILTERS)}>
              <X />
              Clear filters ({activeCount})
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
