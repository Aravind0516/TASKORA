import { cn } from "@/lib/utils";
import type { ProjectPriority } from "@/types/project";
import type { TaskPriority } from "@/types/task";

type Priority = ProjectPriority | TaskPriority;

const PRIORITY_DOT: Record<Priority, string> = {
  Low: "bg-muted-foreground/50",
  Medium: "bg-info",
  High: "bg-amber-500",
  Critical: "bg-danger",
};

const PRIORITY_TEXT: Record<Priority, string> = {
  Low: "text-muted-foreground",
  Medium: "text-info",
  // Amber keeps its existing Tailwind pair — see status-badge.tsx's comment.
  High: "text-amber-700 dark:text-amber-400",
  Critical: "text-danger",
};

export function PriorityBadge({ priority, className }: { priority: Priority; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", PRIORITY_TEXT[priority], className)}>
      <span className={cn("size-1.5 shrink-0 rounded-full", PRIORITY_DOT[priority])} aria-hidden />
      {priority}
    </span>
  );
}
