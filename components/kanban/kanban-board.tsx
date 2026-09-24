"use client";

import { useMemo, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { KanbanColumn } from "@/components/kanban/kanban-column";
import { EMPTY_KANBAN_FILTERS, KanbanToolbar, type KanbanFilters } from "@/components/kanban/kanban-toolbar";
import { TaskFormDialog } from "@/components/tasks/task-form-dialog";
import { useWorkspace } from "@/components/workspace/workspace-provider";
import { TASK_STATUSES, type Task, type TaskStatus } from "@/types/task";

export function KanbanBoard() {
  const { uid, tasks, projects, loaded, errors, retry, updateTaskStatus } = useWorkspace();
  const [openTask, setOpenTask] = useState<Task | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [filters, setFilters] = useState<KanbanFilters>(EMPTY_KANBAN_FILTERS);

  // Display filter only — status changes still go through updateTaskStatus
  // exactly as before, and `tasks` is already scoped to what this account
  // may see (see workspace-provider.tsx's project privacy model).
  const visibleTasks = useMemo(() => {
    const query = filters.search.trim().toLowerCase();
    return tasks.filter((task) => {
      if (filters.projectId !== "all" && task.projectId !== filters.projectId) return false;
      if (filters.priority !== "all" && task.priority !== filters.priority) return false;
      if (filters.assignee === "me" && task.assignedTo !== uid) return false;
      if (filters.assignee === "unassigned" && task.assignedTo) return false;
      if (query && !`${task.title} ${task.description}`.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [tasks, filters, uid]);

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
      <KanbanToolbar filters={filters} onChange={setFilters} projects={projects} visibleCount={visibleTasks.length} totalCount={tasks.length} />

      <div className="flex gap-4 overflow-x-auto pb-2">
        {TASK_STATUSES.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            tasks={visibleTasks.filter((task) => task.status === status)}
            onStatusChange={handleStatusChange}
            onOpen={handleOpen}
          />
        ))}
      </div>

      <TaskFormDialog key={openTask?.id ?? "none"} open={formOpen} onOpenChange={setFormOpen} onSaved={() => {}} task={openTask} />
    </>
  );
}
