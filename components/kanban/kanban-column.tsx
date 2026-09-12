import { KanbanCard } from "@/components/kanban/kanban-card";
import type { Task, TaskStatus } from "@/types/task";

interface KanbanColumnProps {
  status: TaskStatus;
  tasks: Task[];
  onStatusChange: (taskId: string, status: TaskStatus) => void;
}

export function KanbanColumn({ status, tasks, onStatusChange }: KanbanColumnProps) {
  return (
    <div className="flex w-72 shrink-0 flex-col rounded-xl bg-muted/40">
      <div className="flex items-center justify-between px-3 py-3">
        <h3 className="text-sm font-semibold text-foreground">{status}</h3>
        <span className="rounded-full bg-background px-2 py-0.5 text-xs font-medium text-muted-foreground ring-1 ring-foreground/10">
          {tasks.length}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-3 pb-3">
        {tasks.map((task) => (
          <KanbanCard key={task.id} task={task} onStatusChange={onStatusChange} />
        ))}
        {tasks.length === 0 && (
          <p className="rounded-lg border border-dashed border-border py-6 text-center text-xs text-muted-foreground">
            No tasks
          </p>
        )}
      </div>
    </div>
  );
}
