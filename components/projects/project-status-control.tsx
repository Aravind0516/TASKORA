"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/shared/status-badge";
import type { ProjectStatus } from "@/types/project";

const STATUSES: ProjectStatus[] = ["Planning", "Active", "On Hold", "Completed"];

interface ProjectStatusControlProps {
  status: ProjectStatus;
  onStatusChange: (status: ProjectStatus) => void;
  saving?: boolean;
}

export function ProjectStatusControl({ status, onStatusChange, saving }: ProjectStatusControlProps) {
  return (
    <div className="flex items-center gap-2.5">
      <StatusBadge status={status} className="px-2.5 py-1 text-sm" />
      <Select
        value={status}
        onValueChange={(value) => value && onStatusChange(value as ProjectStatus)}
        disabled={saving}
      >
        <SelectTrigger size="sm" aria-label="Change project status">
          <SelectValue placeholder="Change status" />
        </SelectTrigger>
        <SelectContent>
          {STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
