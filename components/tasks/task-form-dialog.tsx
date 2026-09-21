"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, ClipboardList } from "lucide-react";
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
import { StatusBadge } from "@/components/shared/status-badge";
import { PriorityBadge } from "@/components/shared/priority-badge";
import { taskFormSchema, type TaskFormValues } from "@/lib/validation/task.schema";
import { SubtaskChecklist } from "@/components/tasks/subtask-checklist";
import { CommentSection } from "@/components/comments/comment-section";
import { AttachmentSection } from "@/components/attachments/attachment-section";
import { parseOptionalHours, formatDate } from "@/lib/format";
import { useAuth } from "@/components/auth/auth-provider";
import { useWorkspace } from "@/components/workspace/workspace-provider";
import { TASK_STATUSES, type Task, type TaskPriority, type TaskStatus } from "@/types/task";

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
  /**
   * Opens the Daily Work Update flow for this task without leaving the
   * current page — passed only by callers that already render the Work
   * Verification tab themselves (the project detail page). Callers without
   * this (Kanban, My Tasks — different pages entirely) fall back to a real
   * navigation link instead; either way it's the SAME underlying feature,
   * never a second implementation.
   */
  onOpenDailyUpdate?: (task: Task) => void;
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

/** A locked field shown to a viewer who isn't authorized to change it — reads exactly like the equivalent input would, just not editable, so the form doesn't silently reformat itself between roles. */
function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-muted-foreground">{label}</Label>
      <p className="truncate rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-foreground">{value || "—"}</p>
    </div>
  );
}

export function TaskFormDialog({ open, onOpenChange, onSaved, task, defaultAssigneeId, onOpenDailyUpdate }: TaskFormDialogProps) {
  const { user, role } = useAuth();
  const { uid, members, projects, organizationId, getMemberById, createTask, updateTask, updateTaskStatus } = useWorkspace();
  const isEditing = Boolean(task);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [statusSaving, setStatusSaving] = useState(false);
  // Local, optimistic — the `task` prop is a snapshot from whenever the
  // dialog opened and doesn't refresh itself after a save, so without this
  // the status-only Select below would visually snap back to the old value
  // after a successful change instead of showing what was just picked.
  const [displayStatus, setDisplayStatus] = useState(task?.status);

  const taskProject = task ? projects.find((p) => p.id === task.projectId) : undefined;
  // Mirrors firestore.rules' tasks update rule exactly: only Super Admin,
  // that org's Admin, or the task's project's assigned manager may change
  // anything beyond status. A plain assignee's only real write path is
  // status (onlyChangingFields(["status", "updatedAt"])) — estimated/actual
  // hours, the reviewer, dates, and assignment are NOT writable by a plain
  // employee today, so showing them as editable inputs would just produce a
  // permission-denied error on submit. Someone who is neither the assignee
  // nor privileged has no write path here at all, so even status is locked.
  const canEditFull = isEditing && (role === "admin" || role === "super_admin" || taskProject?.managerId === uid);
  const isAssigneeSelf = isEditing && task!.assignedTo === uid;
  const canEditStatusOnly = isEditing && !canEditFull && isAssigneeSelf;
  const fieldsLocked = isEditing && !canEditFull;

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: task ? taskToFormValues(task) : buildDefaultValues(defaultAssigneeId),
  });

  // The assignee list is scoped to the SELECTED project's own memberIds/
  // manager — never every org member. Firestore's task read rule authorizes
  // by project membership (isAuthorizedForProject), not by assignedTo alone,
  // so assigning to someone outside the project silently produces a task
  // its own assignee can never read (confirmed against real production
  // data: two existing tasks assigned to a team member who was never added
  // to that project's memberIds). Being on the same TEAM is not the same as
  // being a PROJECT member in this app's data model — this is exactly the
  // distinction that was easy to miss with an unfiltered picker.
  const selectedProjectId = useWatch({ control, name: "projectId" });
  const selectedAssignee = useWatch({ control, name: "assignedTo" });
  const selectedProject = projects.find((p) => p.id === selectedProjectId);
  const assignableMembers = selectedProject
    ? members.filter((m) => m.id === selectedProject.managerId || selectedProject.memberIds.includes(m.id))
    : [];

  // If the project changes to one the current assignee isn't part of,
  // clear the selection rather than silently keep an invalid combination —
  // matches the Zod schema's existing "Select an assignee" requirement, so
  // submission is blocked until a valid assignee is explicitly chosen again.
  useEffect(() => {
    if (!selectedAssignee) return;
    if (!assignableMembers.some((m) => m.id === selectedAssignee)) {
      setValue("assignedTo", "");
    }
    // Only re-run when the project (and therefore assignableMembers) changes
    // — re-running on every keystroke of selectedAssignee itself would fight
    // the user's own in-progress selection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProjectId]);

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

  async function handleStatusOnlyChange(nextStatus: TaskStatus) {
    if (!task || nextStatus === displayStatus) return;
    const previousStatus = displayStatus;
    setDisplayStatus(nextStatus);
    setStatusSaving(true);
    setSubmitError(null);
    try {
      await updateTaskStatus(task.id, nextStatus);
      onSaved({ ...task, status: nextStatus });
    } catch (error) {
      setDisplayStatus(previousStatus);
      setSubmitError(error instanceof Error ? error.message : "Failed to update status.");
    } finally {
      setStatusSaving(false);
    }
  }

  const assigneeName = task ? (getMemberById(task.assignedTo)?.name ?? "Unassigned") : "";
  const reviewerName = task?.reviewerId ? (getMemberById(task.reviewerId)?.name ?? "—") : "No reviewer";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Task Details" : "Create Task"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? fieldsLocked
                ? "Project, dates, and assignment are set by your project manager or admin."
                : "Update this task's details."
              : "Add a new task to a project."}
          </DialogDescription>
        </DialogHeader>

        {submitError && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>{submitError}</span>
          </div>
        )}

        <form id="task-form" onSubmit={fieldsLocked ? (e) => e.preventDefault() : handleSubmit(onSubmit)} className="space-y-4">
          {fieldsLocked ? (
            <ReadOnlyField label="Title" value={task!.title} />
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="task-title">Title</Label>
              <Input id="task-title" placeholder="e.g. Set up CI pipeline" {...register("title")} />
              {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
            </div>
          )}

          {fieldsLocked ? (
            <div className="space-y-1.5">
              <Label className="text-muted-foreground">Description</Label>
              <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm whitespace-pre-wrap text-foreground">{task!.description || "—"}</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="task-description">Description</Label>
              <Textarea id="task-description" placeholder="What needs to be done?" rows={3} {...register("description")} />
              {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
            </div>
          )}

          {fieldsLocked ? (
            <ReadOnlyField label="Project" value={taskProject?.name ?? "—"} />
          ) : (
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
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="task-status">Status</Label>
              {/*
                Order matters: `fieldsLocked` and `canEditStatusOnly` are only
                ever true when `isEditing` is true (an existing `task` is
                guaranteed), so they must be checked FIRST. The fallback
                branch is reached both for a genuinely locked view AND for
                plain CREATE mode (`isEditing` false, so both the flags above
                are false) — it must never assume `task` exists. A prior
                version checked `canEditFull` first and let a falsy
                `canEditStatusOnly` fall through to `task!.status` on CREATE,
                crashing with "Cannot read properties of null (reading
                'status')" since `task` is null/undefined while creating.
              */}
              {fieldsLocked ? (
                <div className="flex h-9 items-center">
                  <StatusBadge status={task!.status} />
                </div>
              ) : canEditStatusOnly ? (
                <Select value={displayStatus} onValueChange={(value) => handleStatusOnlyChange(value as TaskStatus)} disabled={statusSaving}>
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
              ) : (
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
              )}
            </div>

            <div className="space-y-1.5">
              <Label className={fieldsLocked ? "text-muted-foreground" : undefined} htmlFor={fieldsLocked ? undefined : "task-priority"}>
                Priority
              </Label>
              {fieldsLocked ? (
                <div className="flex h-9 items-center">
                  <PriorityBadge priority={task!.priority} />
                </div>
              ) : (
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
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {fieldsLocked ? (
              <ReadOnlyField label="Assignee" value={assigneeName} />
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="task-assignee">Assignee</Label>
                <Controller
                  control={control}
                  name="assignedTo"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={(value) => field.onChange(value ?? "")} disabled={!selectedProject}>
                      <SelectTrigger id="task-assignee" className="w-full">
                        <SelectValue placeholder={selectedProject ? "Assign to" : "Select a project first"} />
                      </SelectTrigger>
                      <SelectContent>
                        {assignableMembers.map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {selectedProject && assignableMembers.length === 0 && (
                  <p className="text-xs text-muted-foreground">This project has no members yet — add members before assigning a task.</p>
                )}
                {errors.assignedTo && <p className="text-xs text-destructive">{errors.assignedTo.message}</p>}
              </div>
            )}

            {fieldsLocked ? (
              <ReadOnlyField label="Due date" value={task ? formatDate(task.dueDate) : ""} />
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="task-due-date">Due date</Label>
                <Input id="task-due-date" type="date" {...register("dueDate")} />
                {errors.dueDate && <p className="text-xs text-destructive">{errors.dueDate.message}</p>}
              </div>
            )}
          </div>

          {fieldsLocked ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <ReadOnlyField label="Reviewer" value={reviewerName} />
              <ReadOnlyField label="Estimated hours" value={task?.estimatedHours != null ? String(task.estimatedHours) : "—"} />
              <ReadOnlyField label="Actual hours" value={task?.actualHours != null ? String(task.actualHours) : "—"} />
            </div>
          ) : (
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
          )}
        </form>

        {task && taskProject?.workVerificationEnabled && (
          <div className="border-t border-border pt-4">
            {onOpenDailyUpdate ? (
              <Button type="button" variant="outline" className="w-full" onClick={() => onOpenDailyUpdate(task)}>
                <ClipboardList />
                Daily Work Update
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                nativeButton={false}
                render={<Link href={`/projects/${task.projectId}?tab=work-verification&task=${task.id}`} />}
              >
                <ClipboardList />
                Daily Work Update
              </Button>
            )}
          </div>
        )}

        {task && organizationId && <SubtaskChecklist taskId={task.id} organizationId={organizationId} projectId={task.projectId} members={members} />}

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
            {fieldsLocked ? "Close" : "Cancel"}
          </Button>
          {!fieldsLocked && (
            <Button type="submit" form="task-form" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : isEditing ? "Save changes" : "Create Task"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
