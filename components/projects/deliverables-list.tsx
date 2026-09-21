"use client";

import { FileText, CalendarDays } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { formatDate, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Deliverable, DeliverableStatus } from "@/types/deliverable";
import type { TeamMember } from "@/types/team";

const STATUS_STYLES: Record<DeliverableStatus, string> = {
  Pending: "bg-muted text-muted-foreground",
  Ready: "bg-info/10 text-info",
  Delivered: "bg-success/10 text-success",
};

interface DeliverablesListProps {
  deliverables: Deliverable[];
  getMemberById: (id: string) => TeamMember | undefined;
  /** Admin/project-manager only — a plain member sees the same list read-only, matching firestore.rules' update rule exactly. */
  canManage: boolean;
  onStatusChange?: (deliverable: Deliverable, status: DeliverableStatus) => void;
}

export function DeliverablesList({ deliverables, getMemberById, canManage, onStatusChange }: DeliverablesListProps) {
  if (deliverables.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="No deliverables yet"
        description="Deliverables added to this project will appear here."
      />
    );
  }

  return (
    <ul className="divide-y divide-border">
      {deliverables.map((deliverable) => {
        const assignee = deliverable.assignedTo ? getMemberById(deliverable.assignedTo) : undefined;
        return (
          <li key={deliverable.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <FileText className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{deliverable.title}</p>
              <p className="flex flex-wrap items-center gap-x-2.5 text-xs text-muted-foreground">
                <span>Updated {timeAgo(deliverable.updatedAt)}</span>
                {assignee && <span>· {assignee.name}</span>}
                {deliverable.dueDate && (
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="size-3" /> Due {formatDate(deliverable.dueDate)}
                  </span>
                )}
              </p>
            </div>
            {canManage && onStatusChange ? (
              <Select value={deliverable.status} onValueChange={(v) => v && onStatusChange(deliverable, v as DeliverableStatus)}>
                <SelectTrigger size="sm" className={cn("w-32 shrink-0 border-none font-medium", STATUS_STYLES[deliverable.status])}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Ready">Ready</SelectItem>
                  <SelectItem value="Delivered">Delivered</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <span
                className={cn(
                  "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
                  STATUS_STYLES[deliverable.status]
                )}
              >
                {deliverable.status}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
