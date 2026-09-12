import { CalendarClock } from "lucide-react";
import type { Task } from "@/types/task";
import { PriorityBadge } from "@/components/shared/priority-badge";
import { useWorkspace } from "@/components/workspace/workspace-provider";
import { formatDate, daysUntil } from "@/lib/format";

export function UpcomingDeadlines({ tasks }: { tasks: Task[] }) {
  const { getProjectById } = useWorkspace();

  if (tasks.length === 0) {
    return <p className="text-sm text-muted-foreground">No upcoming deadlines.</p>;
  }

  return (
    <ul className="space-y-4">
      {tasks.map((task) => {
        const project = getProjectById(task.projectId);
        const days = daysUntil(task.dueDate);

        return (
          <li key={task.id} className="flex items-start gap-3">
            <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <CalendarClock className="size-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{task.title}</p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{project?.name}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-xs font-medium text-foreground">
                {days === 0 ? "Today" : days === 1 ? "Tomorrow" : `${days}d left`}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{formatDate(task.dueDate)}</p>
              <PriorityBadge priority={task.priority} className="mt-1 justify-end" />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
