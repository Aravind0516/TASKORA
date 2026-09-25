import { MoreHorizontal } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PriorityBadge } from "@/components/shared/priority-badge";
import { formatDate, initials, isOverdue } from "@/lib/format";
import { useWorkspace } from "@/components/workspace/workspace-provider";
import { TASK_STATUSES, type Task, type TaskStatus } from "@/types/task";

interface KanbanCardProps {
  task: Task;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  /** Opens the task's detail dialog (title/description/subtasks/comments/attachments) — the Kanban board previously had no way to open a task at all, only this status-change menu. */
  onOpen: (task: Task) => void;
}

export function KanbanCard({ task, onStatusChange, onOpen }: KanbanCardProps) {
  const { getProjectById, getMemberById } = useWorkspace();
  const project = getProjectById(task.projectId);
  const assignee = getMemberById(task.assignedTo);
  const overdue = isOverdue(task.dueDate, task.status === "Completed");

  return (
    <Card
      size="sm"
      className="cursor-pointer gap-2.5 transition-colors hover:border-primary/40"
      role="button"
      tabIndex={0}
      onClick={() => onOpen(task)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(task);
        }
      }}
    >
      <CardContent className="px-3">
        <div className="flex items-start justify-between gap-2">
          <p className="min-w-0 truncate pt-0.5 text-xs font-medium text-muted-foreground" title={project?.name}>
            {project?.name}
          </p>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="ghost" size="icon-xs" aria-label={`Move ${task.title}`} onClick={(e) => e.stopPropagation()} />}
            >
              <MoreHorizontal />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Move to</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {TASK_STATUSES.filter((status) => status !== task.status).map((status) => (
                  <DropdownMenuItem key={status} onClick={() => onStatusChange(task.id, status)}>
                    {status}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <p className="mt-1 line-clamp-2 text-sm leading-snug font-medium text-foreground" title={task.title}>
          {task.title}
        </p>

        <div className="mt-3 flex items-center gap-2">
          <PriorityBadge priority={task.priority} />
          <span className={`min-w-0 flex-1 truncate text-[11px] ${overdue ? "font-medium text-danger" : "text-muted-foreground"}`}>
            {overdue ? "Overdue · " : "Due "}
            {formatDate(task.dueDate)}
          </span>
          {assignee && (
            <Avatar size="sm" title={assignee.name}>
              <AvatarFallback>{initials(assignee.name)}</AvatarFallback>
            </Avatar>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
