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
import { useAuth } from "@/components/auth/auth-provider";
import type { Task } from "@/types/task";

export function TaskManagementView() {
  const { role } = useAuth();
  const { uid, tasks, projects, loaded, errors, retry, deleteTask } = useWorkspace();
  // `projects` is already scoped to what this account can see (see
  // workspace-provider.tsx's project privacy model), so this correctly
  // answers "does this account manage at least one project" for both an
  // employee (their own authorized projects only) and an admin (every
  // project in the org).
  const canManageAnyProject = projects.some((p) => p.managerId === uid);
  // Matches firestore.rules' tasks create rule exactly: Org Admin/Super
  // Admin, or a project's own assigned manager creating within that
  // project. Delete is narrower (admin-only — see the tasks delete rule),
  // so it's tracked separately rather than reusing this same flag.
  const canCreateTasks = role === "admin" || role === "super_admin" || canManageAnyProject;
  const canDeleteTasks = role === "admin" || role === "super_admin";

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
      {canCreateTasks && (
        <div className="mb-5 flex items-center justify-end">
          <Button size="sm" onClick={openCreateDialog}>
            <Plus />
            New Task
          </Button>
        </div>
      )}

      {successMessage && (
        <div className="mb-5 flex items-center gap-2 rounded-lg bg-success/10 px-4 py-2.5 text-sm text-success">
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
          description={canCreateTasks ? "Create a task to start tracking your work." : "Your manager or admin will assign tasks to you here."}
          actionLabel={canCreateTasks ? "New Task" : undefined}
          onAction={canCreateTasks ? openCreateDialog : undefined}
        />
      ) : (
        <TaskTable
          tasks={myTasks}
          onEdit={openEditDialog}
          onDelete={canDeleteTasks ? handleDeleteTask : undefined}
          canEditTask={(task) => {
            const project = projects.find((p) => p.id === task.projectId);
            return role === "admin" || role === "super_admin" || project?.managerId === uid;
          }}
        />
      )}

      <TaskFormDialog
        key={editingTask?.id ?? "new"}
        open={formOpen}
        onOpenChange={setFormOpen}
        onSaved={handleSaved}
        task={editingTask}
      />
    </div>
  );
}
