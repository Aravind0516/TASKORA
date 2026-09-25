"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ProjectPriority } from "@/types/project";
import { SearchInput } from "@/components/shared/search-input";

const PRIORITIES: ProjectPriority[] = ["Low", "Medium", "High", "Critical"];

interface ProjectFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  priority: ProjectPriority | "all";
  onPriorityChange: (value: ProjectPriority | "all") => void;
  activeCount: number;
  onClear: () => void;
}

export function ProjectFilters({
  search,
  onSearchChange,
  priority,
  onPriorityChange,
  activeCount,
  onClear,
}: ProjectFiltersProps) {
  return (
    <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center">
      <SearchInput
        className="w-full sm:max-w-xs"
        aria-label="Search projects"
        placeholder="Search projects..."
        value={search}
        onValueChange={onSearchChange}
      />

      <Select
        value={priority}
        onValueChange={(value) => onPriorityChange((value ?? "all") as ProjectPriority | "all")}
        items={{ all: "All priorities", ...Object.fromEntries(PRIORITIES.map((p) => [p, p])) }}
      >
        <SelectTrigger className="w-full sm:w-40 data-[size=default]:h-10" aria-label="Filter by priority">
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
