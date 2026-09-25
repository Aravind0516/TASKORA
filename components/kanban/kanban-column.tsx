import { KanbanCard } from "@/components/kanban/kanban-card";
import { cn } from "@/lib/utils";
import type { Task, TaskStatus } from "@/types/task";

interface KanbanColumnProps {
  status: TaskStatus;
  tasks: Task[];
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onOpen: (task: Task) => void;
}

// Accent dot per stage — the same semantic tokens components/shared/
// status-badge.tsx uses for these statuses, so a column reads as the same
// stage its tasks' badges show everywhere else.
const STATUS_ACCENT: Record<TaskStatus, string> = {
  Backlog: "bg-muted-foreground/50",
  "To Do": "bg-info/60",
  "In Progress": "bg-info",
  "In Review": "bg-violet-500",
  Blocked: "bg-danger",
  Completed: "bg-success",
};

/**
 * One workflow stage. Sized by the parent grid (see kanban-board.tsx) rather
 * than a fixed width, so columns flow into as many rows as the viewport needs
 * instead of one long horizontal strip.
 */
export function KanbanColumn({ status, tasks, onStatusChange, onOpen }: KanbanColumnProps) {
  const headingId = `kanban-col-${status.replace(/\s+/g, "-").toLowerCase()}`;

  return (
    <section aria-labelledby={headingId} className="flex min-w-0 flex-col rounded-xl border border-border bg-muted/30">
      <header className="flex items-center gap-2 border-b border-border/70 px-3.5 py-2.5">
        <span aria-hidden className={cn("size-2 shrink-0 rounded-full", STATUS_ACCENT[status])} />
        <h3 id={headingId} className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
          {status}
        </h3>
        <span
          className="rounded-full bg-background px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground ring-1 ring-foreground/10"
          aria-label={`${tasks.length} ${tasks.length === 1 ? "task" : "tasks"}`}
        >
          {tasks.length}
        </span>
      </header>
      <div className="flex flex-1 flex-col gap-2 p-2.5">
        {tasks.map((task) => (
          <KanbanCard key={task.id} task={task} onStatusChange={onStatusChange} onOpen={onOpen} />
        ))}
        {tasks.length === 0 && (
          <p className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-border/80 px-3 py-6 text-center text-xs text-muted-foreground">
            No tasks in this stage
          </p>
        )}
      </div>
    </section>
  );
}
