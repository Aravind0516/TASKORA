"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, ClipboardList, ListChecks } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/shared/status-badge";
import { PriorityBadge } from "@/components/shared/priority-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDate, isOverdue } from "@/lib/format";
import * as subtaskService from "@/lib/services/subtask.service";
import type { Task } from "@/types/task";
import type { Subtask } from "@/types/subtask";

interface ProjectMyTasksPanelProps {
  organizationId: string;
  projectId: string;
  /** Already filtered to this member's own assignments in this project — never someone else's tasks. */
  myTasks: Task[];
  onOpenTask: (task: Task) => void;
}

/**
 * The employee-facing replacement for the full project Tasks table — "what
 * am I supposed to work on?" answered directly, without wading through every
 * task on the project. Reuses the same Task data/security (a plain assignee
 * was already the only one who could see this project's tasks at all) and
 * the same subtasks collection, just queried for several tasks at once.
 */
export function ProjectMyTasksPanel({ organizationId, projectId, myTasks, onOpenTask }: ProjectMyTasksPanelProps) {
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const taskIdsKey = myTasks.map((t) => t.id).join(",");

  useEffect(() => {
    const ids = taskIdsKey ? taskIdsKey.split(",") : [];
    const unsubscribe = subtaskService.subscribeToSubtasksByTaskIds(organizationId, projectId, ids, setSubtasks, () => setSubtasks([]));
    return unsubscribe;
  }, [organizationId, projectId, taskIdsKey]);

  if (myTasks.length === 0) {
    return (
      <EmptyState
        icon={ListChecks}
        title="No tasks assigned to you yet"
        description="When a manager or admin assigns you a task on this project, it will show up here."
      />
    );
  }

  const sorted = [...myTasks].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {sorted.map((task) => {
        const taskSubtasks = subtasks.filter((s) => s.taskId === task.id);
        const completedSubtasks = taskSubtasks.filter((s) => s.completed).length;
        const overdue = isOverdue(task.dueDate, task.status === "Completed");
        return (
          <Card key={task.id} className={task.status === "Blocked" ? "border-rose-200 dark:border-rose-500/30" : undefined}>
            <CardContent className="space-y-3 px-4 py-4">
              <button
                type="button"
                onClick={() => onOpenTask(task)}
                className="block w-full truncate text-left text-sm font-medium text-foreground hover:text-primary hover:underline"
              >
                {task.title}
              </button>

              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={task.status} />
                <PriorityBadge priority={task.priority} />
                {task.status === "Blocked" && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 dark:text-rose-400">
                    <AlertTriangle className="size-3.5" />
                    Blocked
                  </span>
                )}
              </div>

              <p className={overdue ? "text-xs font-medium text-danger" : "text-xs text-muted-foreground"}>
                Due {formatDate(task.dueDate)}
                {overdue ? " — overdue" : ""}
              </p>

              {taskSubtasks.length > 0 && (
                <div>
                  <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                    <span>Subtasks</span>
                    <span>
                      {completedSubtasks}/{taskSubtasks.length}
                    </span>
                  </div>
                  <Progress value={Math.round((completedSubtasks / taskSubtasks.length) * 100)} className="h-1.5" />
                </div>
              )}

              <Button size="sm" variant="outline" className="w-full" onClick={() => onOpenTask(task)}>
                <ClipboardList />
                Open Task
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
