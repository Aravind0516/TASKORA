"use client";

import { useEffect } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { platformTaskFormSchema, type PlatformTaskFormValues } from "@/lib/validation/platform-task.schema";
import { PLATFORM_TASK_STATUSES, PLATFORM_PRIORITIES } from "@/lib/platform/constants";
import { SubtaskChecklist } from "@/components/tasks/subtask-checklist";
import { CommentSection } from "@/components/comments/comment-section";
import { parseOptionalHours } from "@/lib/format";
import { useAuth } from "@/components/auth/auth-provider";
import { usePlatform } from "@/components/platform/platform-provider";
import type { PlatformProject, PlatformTask, PlatformUser } from "@/types/platform";

// Sentinel item value for "no reviewer assigned" — Select items can't use an
// empty string as their value, same pattern as every other optional picker
// in this codebase (Team Lead, Project Manager, Functional Role, ...).
const NO_REVIEWER = "none";

interface TaskFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitTask: (values: PlatformTaskFormValues) => void;
  projects: PlatformProject[];
  users: PlatformUser[];
  task?: PlatformTask | null;
}

const defaultValues: PlatformTaskFormValues = {
  title: "",
  description: "",
  projectId: "",
  status: "Backlog",
  priority: "Medium",
  assigneeId: undefined,
  reviewerId: undefined,
  estimatedHours: undefined,
  actualHours: undefined,
  dueDate: "",
};

function taskToFormValues(task: PlatformTask): PlatformTaskFormValues {
  return {
    title: task.title,
    description: task.description,
    projectId: task.projectId,
    status: task.status,
    priority: task.priority,
    assigneeId: task.assigneeId ?? undefined,
    reviewerId: task.reviewerId ?? undefined,
    estimatedHours: task.estimatedHours ?? undefined,
    actualHours: task.actualHours ?? undefined,
    dueDate: task.dueDate,
  };
}

export function TaskFormDialog({ open, onOpenChange, onSubmitTask, projects, users, task }: TaskFormDialogProps) {
  const isEditing = Boolean(task);
  const { user } = useAuth();
  const { getUser } = usePlatform();

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<PlatformTaskFormValues>({
    resolver: zodResolver(platformTaskFormSchema),
    defaultValues: task ? taskToFormValues(task) : defaultValues,
  });

  useEffect(() => {
    if (!open) return;
    reset(task ? taskToFormValues(task) : defaultValues);
  }, [open, task, reset]);

  // The assignee list is scoped to the SELECTED project's own memberIds/
  // manager — never every org member. Firestore's task read rule authorizes
  // by project membership, not by assigneeId alone, so assigning to someone
  // outside the project silently produces a task its own assignee can never
  // read (confirmed against real production data: two existing tasks
  // assigned to a team member who was never added to that project's
  // memberIds — being on the same TEAM is not the same as being a PROJECT
  // member in this app's data model).
  const selectedProjectId = useWatch({ control, name: "projectId" });
  const selectedAssignee = useWatch({ control, name: "assigneeId" });
  const selectedProject = projects.find((p) => p.id === selectedProjectId);
  const assignableUsers = selectedProject
    ? users.filter((u) => u.id === selectedProject.managerId || selectedProject.memberIds.includes(u.id))
    : [];

  useEffect(() => {
    if (!selectedAssignee) return;
    if (!assignableUsers.some((u) => u.id === selectedAssignee)) {
      setValue("assigneeId", undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProjectId]);

  function handleOpenChange(next: boolean) {
    if (!next) reset(defaultValues);
    onOpenChange(next);
  }

  function onSubmit(values: PlatformTaskFormValues) {
    onSubmitTask(values);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Task" : "Create Task"}</DialogTitle>
          <DialogDescription>{isEditing ? "Update this task's details." : "Add a new task to a project."}</DialogDescription>
        </DialogHeader>

        <form id="platform-task-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="pt-title">Title</Label>
            <Input id="pt-title" placeholder="e.g. Finalize schema migration" {...register("title")} />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pt-description">Description</Label>
            <Textarea id="pt-description" rows={3} placeholder="What needs to be done?" {...register("description")} />
            {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pt-project">Project</Label>
            <Controller
              control={control}
              name="projectId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={(value) => field.onChange(value ?? "")}>
                  <SelectTrigger id="pt-project" className="w-full">
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
              <Label htmlFor="pt-status">Status</Label>
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={(value) => field.onChange(value ?? "Backlog")}>
                    <SelectTrigger id="pt-status" className="w-full">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      {PLATFORM_TASK_STATUSES.map((status) => (
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
              <Label htmlFor="pt-priority">Priority</Label>
              <Controller
                control={control}
                name="priority"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={(value) => field.onChange(value ?? "Medium")}>
                    <SelectTrigger id="pt-priority" className="w-full">
                      <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      {PLATFORM_PRIORITIES.map((priority) => (
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
              <Label htmlFor="pt-assignee">Assignee</Label>
              <Controller
                control={control}
                name="assigneeId"
                render={({ field }) => (
                  <Select value={field.value ?? ""} onValueChange={(value) => field.onChange(value || undefined)} disabled={!selectedProject}>
                    <SelectTrigger id="pt-assignee" className="w-full">
                      <SelectValue placeholder={selectedProject ? "Unassigned" : "Select a project first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {assignableUsers.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {selectedProject && assignableUsers.length === 0 && (
                <p className="text-xs text-muted-foreground">This project has no members yet — add members before assigning a task.</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pt-due">Due date</Label>
              <Input id="pt-due" type="date" {...register("dueDate")} />
              {errors.dueDate && <p className="text-xs text-destructive">{errors.dueDate.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="pt-reviewer">Reviewer</Label>
              <Controller
                control={control}
                name="reviewerId"
                render={({ field }) => (
                  <Select value={field.value || NO_REVIEWER} onValueChange={(value) => field.onChange(value === NO_REVIEWER ? undefined : value)}>
                    <SelectTrigger id="pt-reviewer" className="w-full">
                      <SelectValue placeholder="No reviewer" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_REVIEWER}>No reviewer</SelectItem>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pt-estimated-hours">Estimated hours</Label>
              <Input
                id="pt-estimated-hours"
                type="number"
                min={0}
                step={0.5}
                placeholder="e.g. 8"
                {...register("estimatedHours", { setValueAs: parseOptionalHours })}
              />
              {errors.estimatedHours && <p className="text-xs text-destructive">{errors.estimatedHours.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pt-actual-hours">Actual hours</Label>
              <Input
                id="pt-actual-hours"
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

        {task && <SubtaskChecklist taskId={task.id} organizationId={task.organizationId} projectId={task.projectId} members={users} />}

        {task && user && (
          <CommentSection
            organizationId={task.organizationId}
            currentUserId={user.uid}
            currentUserName={getUser(user.uid)?.name ?? user.displayName ?? user.email ?? "You"}
            getAuthorName={(authorUid) => getUser(authorUid)?.name}
            target={{ kind: "task", taskId: task.id, projectId: task.projectId }}
            variant="compact"
            notifyRecipientIds={[task.assigneeId, task.ownerId, projects.find((p) => p.id === task.projectId)?.managerId ?? null]}
            getRecipientPreferences={(memberUid) => getUser(memberUid)?.notificationPreferences}
            entityLabel={task.title}
          />
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="platform-task-form" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : isEditing ? "Save changes" : "Create Task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
