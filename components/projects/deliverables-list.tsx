import { FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Deliverable, DeliverableStatus } from "@/types/deliverable";

const STATUS_STYLES: Record<DeliverableStatus, string> = {
  Pending: "bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300",
  Ready: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
  Delivered: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
};

export function DeliverablesList({ deliverables }: { deliverables: Deliverable[] }) {
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
      {deliverables.map((deliverable) => (
        <li key={deliverable.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <FileText className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{deliverable.name}</p>
            <p className="text-xs text-muted-foreground">Updated {timeAgo(deliverable.updatedAt)}</p>
          </div>
          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
              STATUS_STYLES[deliverable.status]
            )}
          >
            {deliverable.status}
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            className="shrink-0"
            disabled
            title="File storage isn't connected yet"
            aria-label={`Download ${deliverable.name} (unavailable)`}
          >
            <Download />
          </Button>
        </li>
      ))}
    </ul>
  );
}
