import { cn } from "@/lib/utils";
import type { ProjectPriority } from "@/types/project";
import type { TaskPriority } from "@/types/task";

type Priority = ProjectPriority | TaskPriority;

const PRIORITY_DOT: Record<Priority, string> = {
  Low: "bg-slate-400",
  Medium: "bg-sky-500",
  High: "bg-amber-500",
  Critical: "bg-rose-500",
};

const PRIORITY_TEXT: Record<Priority, string> = {
  Low: "text-slate-600 dark:text-slate-400",
  Medium: "text-sky-700 dark:text-sky-400",
  High: "text-amber-700 dark:text-amber-400",
  Critical: "text-rose-700 dark:text-rose-400",
};

export function PriorityBadge({ priority, className }: { priority: Priority; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", PRIORITY_TEXT[priority], className)}>
      <span className={cn("size-1.5 shrink-0 rounded-full", PRIORITY_DOT[priority])} aria-hidden />
      {priority}
    </span>
  );
}
