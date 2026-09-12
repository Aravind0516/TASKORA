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
}

export function KanbanCard({ task, onStatusChange }: KanbanCardProps) {
  const { getProjectById, getMemberById } = useWorkspace();
  const project = getProjectById(task.projectId);
  const assignee = getMemberById(task.assignedTo);
  const overdue = isOverdue(task.dueDate, task.status === "Completed");

  return (
    <Card size="sm" className="gap-2.5">
      <CardContent className="px-3">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-medium text-muted-foreground">{project?.name}</p>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="ghost" size="icon-xs" aria-label={`Move ${task.title}`} />}
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
        <p className="mt-1 text-sm font-medium text-foreground">{task.title}</p>

        <div className="mt-3 flex items-center justify-between">
          <PriorityBadge priority={task.priority} />
          {assignee && (
            <Avatar size="sm">
              <AvatarFallback>{initials(assignee.name)}</AvatarFallback>
            </Avatar>
          )}
        </div>
        <p className={`mt-2 text-[11px] ${overdue ? "font-medium text-[#d03b3b]" : "text-muted-foreground"}`}>
          Due {formatDate(task.dueDate)}
        </p>
      </CardContent>
    </Card>
  );
}
