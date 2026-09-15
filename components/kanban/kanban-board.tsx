"use client";

import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { KanbanColumn } from "@/components/kanban/kanban-column";
import { TaskFormDialog } from "@/components/tasks/task-form-dialog";
import { useWorkspace } from "@/components/workspace/workspace-provider";
import { TASK_STATUSES, type Task, type TaskStatus } from "@/types/task";

export function KanbanBoard() {
  const { tasks, loaded, errors, retry, updateTaskStatus } = useWorkspace();
  const [openTask, setOpenTask] = useState<Task | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  async function handleStatusChange(taskId: string, status: TaskStatus) {
    try {
      await updateTaskStatus(taskId, status);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Failed to update task status.");
    }
  }

  function handleOpen(task: Task) {
    setOpenTask(task);
    setFormOpen(true);
  }

  if (!loaded.tasks) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-2">
        {TASK_STATUSES.map((status) => (
          <Skeleton key={status} className="h-96 w-72 shrink-0 rounded-xl" />
        ))}
      </div>
    );
  }

  if (errors.tasks) {
    return <ErrorState message={errors.tasks} onRetry={retry} />;
  }

  return (
    <>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {TASK_STATUSES.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            tasks={tasks.filter((task) => task.status === status)}
            onStatusChange={handleStatusChange}
            onOpen={handleOpen}
          />
        ))}
      </div>

      <TaskFormDialog key={openTask?.id ?? "none"} open={formOpen} onOpenChange={setFormOpen} onSaved={() => {}} task={openTask} />
    </>
  );
}
