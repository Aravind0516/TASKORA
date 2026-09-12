"use client";

import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ProjectPriority, ProjectStatus } from "@/types/project";

const STATUSES: ProjectStatus[] = ["Planning", "Active", "On Hold", "Completed"];
const PRIORITIES: ProjectPriority[] = ["Low", "Medium", "High", "Critical"];

interface ProjectFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  status: ProjectStatus | "all";
  onStatusChange: (value: ProjectStatus | "all") => void;
  priority: ProjectPriority | "all";
  onPriorityChange: (value: ProjectPriority | "all") => void;
  activeCount: number;
  onClear: () => void;
}

export function ProjectFilters({
  search,
  onSearchChange,
  status,
  onStatusChange,
  priority,
  onPriorityChange,
  activeCount,
  onClear,
}: ProjectFiltersProps) {
  return (
    <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="relative w-full sm:max-w-xs">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          aria-label="Search projects"
          placeholder="Search projects..."
          className="pl-9"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <Select value={status} onValueChange={(value) => onStatusChange((value ?? "all") as ProjectStatus | "all")}>
        <SelectTrigger className="w-full sm:w-40" aria-label="Filter by status">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          {STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={priority}
        onValueChange={(value) => onPriorityChange((value ?? "all") as ProjectPriority | "all")}
      >
        <SelectTrigger className="w-full sm:w-40" aria-label="Filter by priority">
          <SelectValue placeholder="Priority" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All priorities</SelectItem>
          {PRIORITIES.map((p) => (
            <SelectItem key={p} value={p}>
              {p}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {activeCount > 0 && (
        <Button variant="ghost" size="sm" onClick={onClear} className="text-muted-foreground">
          <X />
          Clear filters ({activeCount})
        </Button>
      )}
    </div>
  );
}
