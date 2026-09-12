import { cn } from "@/lib/utils";
import type { ProjectStatus } from "@/types/project";
import type { TaskStatus } from "@/types/task";

type Status = ProjectStatus | TaskStatus;

const STATUS_STYLES: Record<Status, string> = {
  Planning: "bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300",
  Backlog: "bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300",
  "To Do": "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
  Active: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  "In Progress": "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  "In Review": "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
  "On Hold": "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  Blocked: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  Completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
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
