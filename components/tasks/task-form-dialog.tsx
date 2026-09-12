"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { taskFormSchema, type TaskFormValues } from "@/lib/validation/task.schema";
import { SubtaskChecklist } from "@/components/tasks/subtask-checklist";
import { CommentSection } from "@/components/comments/comment-section";
import { AttachmentSection } from "@/components/attachments/attachment-section";
import { parseOptionalHours } from "@/lib/format";
import { useAuth } from "@/components/auth/auth-provider";
import { useWorkspace } from "@/components/workspace/workspace-provider";
import { TASK_STATUSES, type Task, type TaskPriority } from "@/types/task";

const PRIORITIES: TaskPriority[] = ["Low", "Medium", "High", "Critical"];

// Sentinel item value for "no reviewer assigned" — Select items can't use an
// empty string as their value, same pattern used throughout this codebase.
const NO_REVIEWER = "none";

interface TaskFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (task: Task) => void;
  task?: Task | null;
  defaultAssigneeId?: string;
}

function buildDefaultValues(defaultAssigneeId?: string): TaskFormValues {
  return {
    title: "",
    description: "",
    projectId: "",
    status: "Backlog",
    priority: "Medium",
    assignedTo: defaultAssigneeId ?? "",
    reviewerId: undefined,
    estimatedHours: undefined,
    actualHours: undefined,
    dueDate: "",
  };
}

function taskToFormValues(task: Task): TaskFormValues {
  return {
    title: task.title,
    description: task.description,
    projectId: task.projectId,
    status: task.status,
    priority: task.priority,
    assignedTo: task.assignedTo,
    reviewerId: task.reviewerId ?? undefined,
    estimatedHours: task.estimatedHours ?? undefined,
    actualHours: task.actualHours ?? undefined,
    dueDate: task.dueDate,
  };
}

export function TaskFormDialog({ open, onOpenChange, onSaved, task, defaultAssigneeId }: TaskFormDialogProps) {
  const { user } = useAuth();
  const { uid, members, projects, organizationId, getMemberById, createTask, updateTask } = useWorkspace();
  const isEditing = Boolean(task);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: task ? taskToFormValues(task) : buildDefaultValues(defaultAssigneeId),
  });

  function handleOpenChange(next: boolean) {
    if (!next) {
      reset(buildDefaultValues(defaultAssigneeId));
      setSubmitError(null);
    }
    onOpenChange(next);
  }

  async function onSubmit(values: TaskFormValues) {
    setSubmitError(null);
    try {
      if (isEditing && task) {
        await updateTask(task.id, values);
        onSaved({ ...task, ...values });
      } else {
        const created = await createTask(values);
        onSaved(created);
      }
      onOpenChange(false);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Failed to save task.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Task" : "Create Task"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update this task's details." : "Add a new task to a project."}
          </DialogDescription>
        </DialogHeader>

        <form id="task-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {submitError && (
            <div className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="task-title">Title</Label>
            <Input id="task-title" placeholder="e.g. Set up CI pipeline" {...register("title")} />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="task-description">Description</Label>
            <Textarea id="task-description" placeholder="What needs to be done?" rows={3} {...register("description")} />
            {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="task-project">Project</Label>
            <Controller
              control={control}
              name="projectId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={(value) => field.onChange(value ?? "")}>
                  <SelectTrigger id="task-project" className="w-full">
                    <SelectValue placeholder="Select a project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.projectId && <p className="text-xs text-destructive">{errors.projectId.message}</p>}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="task-status">Status</Label>
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={(value) => field.onChange(value ?? "Backlog")}>
                    <SelectTrigger id="task-status" className="w-full">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      {TASK_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="task-priority">Priority</Label>
              <Controller
                control={control}
                name="priority"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={(value) => field.onChange(value ?? "Medium")}>
                    <SelectTrigger id="task-priority" className="w-full">
                      <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITIES.map((priority) => (
                        <SelectItem key={priority} value={priority}>
                          {priority}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="task-assignee">Assignee</Label>
              <Controller
                control={control}
                name="assignedTo"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={(value) => field.onChange(value ?? "")}>
                    <SelectTrigger id="task-assignee" className="w-full">
                      <SelectValue placeholder="Assign to" />
                    </SelectTrigger>
                    <SelectContent>
                      {members.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.assignedTo && <p className="text-xs text-destructive">{errors.assignedTo.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="task-due-date">Due date</Label>
              <Input id="task-due-date" type="date" {...register("dueDate")} />
              {errors.dueDate && <p className="text-xs text-destructive">{errors.dueDate.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="task-reviewer">Reviewer</Label>
              <Controller
                control={control}
                name="reviewerId"
                render={({ field }) => (
                  <Select value={field.value || NO_REVIEWER} onValueChange={(value) => field.onChange(value === NO_REVIEWER ? undefined : value)}>
                    <SelectTrigger id="task-reviewer" className="w-full">
                      <SelectValue placeholder="No reviewer" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_REVIEWER}>No reviewer</SelectItem>
                      {members.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="task-estimated-hours">Estimated hours</Label>
              <Input
                id="task-estimated-hours"
                type="number"
                min={0}
                step={0.5}
                placeholder="e.g. 8"
                {...register("estimatedHours", { setValueAs: parseOptionalHours })}
              />
              {errors.estimatedHours && <p className="text-xs text-destructive">{errors.estimatedHours.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="task-actual-hours">Actual hours</Label>
              <Input
                id="task-actual-hours"
                type="number"
                min={0}
                step={0.5}
                placeholder="e.g. 6.5"
                {...register("actualHours", { setValueAs: parseOptionalHours })}
              />
              {errors.actualHours && <p className="text-xs text-destructive">{errors.actualHours.message}</p>}
            </div>
          </div>
        </form>

        {task && organizationId && <SubtaskChecklist taskId={task.id} organizationId={organizationId} members={members} />}

        {task && organizationId && uid && (
          <AttachmentSection
            organizationId={organizationId}
            currentUserId={uid}
            getUploaderName={(uploaderUid) => getMemberById(uploaderUid)?.name}
            target={{ kind: "task", taskId: task.id, projectId: task.projectId }}
            variant="compact"
          />
        )}

        {task && organizationId && uid && (
          <CommentSection
            organizationId={organizationId}
            currentUserId={uid}
            currentUserName={getMemberById(uid)?.name ?? user?.displayName ?? user?.email ?? "You"}
            getAuthorName={(authorUid) => getMemberById(authorUid)?.name}
            target={{ kind: "task", taskId: task.id, projectId: task.projectId }}
            variant="compact"
            notifyRecipientIds={[task.assignedTo, task.ownerId, projects.find((p) => p.id === task.projectId)?.managerId ?? null]}
            getRecipientPreferences={(memberUid) => getMemberById(memberUid)?.notificationPreferences}
            entityLabel={task.title}
          />
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="task-form" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : isEditing ? "Save changes" : "Create Task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
