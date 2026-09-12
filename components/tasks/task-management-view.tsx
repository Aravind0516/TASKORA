"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ListChecks, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TaskTable } from "@/components/tasks/task-table";
import { TaskFormDialog } from "@/components/tasks/task-form-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { useWorkspace } from "@/components/workspace/workspace-provider";
import type { Task } from "@/types/task";

export function TaskManagementView() {
  const { uid, tasks, loaded, errors, retry, deleteTask } = useWorkspace();

  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!successMessage) return;
    const timeout = setTimeout(() => setSuccessMessage(null), 3500);
    return () => clearTimeout(timeout);
  }, [successMessage]);

  const myTasks = useMemo(() => tasks.filter((task) => task.assignedTo === uid), [tasks, uid]);
  const loading = !loaded.tasks;

  function openCreateDialog() {
    setEditingTask(null);
    setFormOpen(true);
  }

  function openEditDialog(task: Task) {
    setEditingTask(task);
    setFormOpen(true);
  }

  function handleSaved(task: Task) {
    if (editingTask) {
      setSuccessMessage(`"${task.title}" was updated.`);
    } else if (task.assignedTo !== uid) {
      setSuccessMessage(`"${task.title}" was created and assigned to someone else.`);
    } else {
      setSuccessMessage(`"${task.title}" was created.`);
    }
  }

  async function handleDeleteTask(task: Task) {
    const confirmed = window.confirm(`Delete "${task.title}"? This can't be undone.`);
    if (!confirmed) return;
    try {
      await deleteTask(task.id);
      setSuccessMessage(`"${task.title}" was deleted.`);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Failed to delete task.");
    }
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-end">
        <Button size="sm" onClick={openCreateDialog}>
          <Plus />
          New Task
        </Button>
      </div>

      {successMessage && (
        <div className="mb-5 flex items-center gap-2 rounded-lg bg-[#0ca30c]/10 px-4 py-2.5 text-sm text-[#0ca30c]">
          <CheckCircle2 className="size-4 shrink-0" />
          {successMessage}
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-9 w-full max-w-md" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : errors.tasks ? (
        <ErrorState message={errors.tasks} onRetry={retry} />
      ) : myTasks.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="No tasks assigned to you"
          description="Create a task to start tracking your work."
          actionLabel="New Task"
          onAction={openCreateDialog}
        />
      ) : (
        <TaskTable tasks={myTasks} onEdit={openEditDialog} onDelete={handleDeleteTask} />
      )}

      <TaskFormDialog
        key={editingTask?.id ?? "new"}
        open={formOpen}
        onOpenChange={setFormOpen}
        onSaved={handleSaved}
        task={editingTask}
        defaultAssigneeId={uid ?? undefined}
      />
    </div>
  );
}
