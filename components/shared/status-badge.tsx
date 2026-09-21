import { cn } from "@/lib/utils";
import type { ProjectStatus } from "@/types/project";
import type { TaskStatus } from "@/types/task";

type Status = ProjectStatus | TaskStatus;

// Migrated to TASKORA's centralized semantic tokens (bg-success/10
// text-success, etc. — see app/globals.css) wherever an accessible token
// pairing exists. Warning/amber is the one deliberate exception: the
// semantic --warning-foreground value is tuned for text ON TOP of a solid
// --warning fill, not for a tinted bg-warning/10 chip — using it there reads
// fine in light mode but fails contrast in dark mode (dark brown text on a
// still-dark tinted background). Amber therefore keeps its existing,
// already-accessible Tailwind light/dark pair rather than adopting a token
// combination that would look broken. "In Review" keeps violet deliberately
// too — violet is the landing page's own secondary brand accent (see
// components/landing/shared/ambient-background.tsx's glow), not a stray
// color.
const STATUS_STYLES: Record<Status, string> = {
  Planning: "bg-muted text-muted-foreground",
  Backlog: "bg-muted text-muted-foreground",
  "To Do": "bg-info/10 text-info",
  Active: "bg-info/10 text-info",
  "In Progress": "bg-info/10 text-info",
  "In Review": "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
  "On Hold": "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  Blocked: "bg-danger/10 text-danger",
  Completed: "bg-success/10 text-success",
};

export function StatusBadge({ status, className }: { status: Status; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex w-fit shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        STATUS_STYLES[status],
        className
      )}
    >
      {status}
    </span>
  );
}
