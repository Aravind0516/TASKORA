"use client";

import { useState } from "react";
import { useForm, useWatch, Controller } from "react-hook-form";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { projectFormSchema, type ProjectFormValues } from "@/lib/validation/project.schema";
import { useAuth } from "@/components/auth/auth-provider";
import { useWorkspace } from "@/components/workspace/workspace-provider";
import { initials } from "@/lib/format";
import type { Project, ProjectPriority, ProjectStatus } from "@/types/project";
import { selectItems } from "@/lib/select-items";
import { projectAssigneeIds, repositoryUrlError } from "@/lib/projects/assignment";

const STATUSES: ProjectStatus[] = ["Planning", "Active", "On Hold", "Completed"];
const PRIORITIES: ProjectPriority[] = ["Low", "Medium", "High", "Critical"];

// Sentinel item value for "no manager assigned" — Select items can't use an
// empty string as their value, so this is translated to/from undefined at
// the form boundary.
const NO_MANAGER = "none";

interface ProjectFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (project: Project) => void;
  project?: Project | null;
}

const defaultValues: ProjectFormValues = {
  name: "",
  description: "",
  status: "Planning",
  priority: "Medium",
  startDate: "",
  dueDate: "",
  teamId: "",
  memberIds: [],
  managerId: undefined,
  workVerificationEnabled: false,
  repositoryUrl: "",
  requirements: "",
};

function projectToFormValues(project: Project): ProjectFormValues {
  return {
    name: project.name,
    description: project.description,
    status: project.status,
    priority: project.priority,
    startDate: project.startDate,
    dueDate: project.dueDate,
    teamId: project.teamId,
    memberIds: project.memberIds,
    managerId: project.managerId ?? undefined,
    workVerificationEnabled: project.workVerificationEnabled,
    repositoryUrl: project.repositoryUrl ?? "",
    requirements: project.requirements ?? "",
  };
}

export function ProjectFormDialog({ open, onOpenChange, onSaved, project }: ProjectFormDialogProps) {
  const { user, role } = useAuth();
  const { members, teams, uid, getMemberById, isInternMember, createProject, updateProject } = useWorkspace();
  const isEditing = Boolean(project);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // Only an Admin's write path is unrestricted enough to change this field —
  // a project's assigned manager's firestore.rules onlyChangingFields
  // allow-list doesn't include workVerificationEnabled, so the control is
  // hidden rather than shown-then-denied for anyone else.
  const canConfigureWorkVerification = role === "admin" || role === "super_admin";

  // Owner is never a form field (see PROJECT OWNER fix) — always the
  // authenticated creator, read-only thereafter.
  const ownerName = project ? (getMemberById(project.ownerId)?.name ?? "Unknown") : (user?.displayName ?? user?.email ?? "You");

  const {
    register,
    handleSubmit,
    control,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: project ? projectToFormValues(project) : defaultValues,
  });

  const selectedMemberIds = useWatch({ control, name: "memberIds" });
  const selectedManagerId = useWatch({ control, name: "managerId" });
  const repositoryRequired = projectAssigneeIds({
    memberIds: selectedMemberIds ?? [],
    managerId: selectedManagerId && selectedManagerId !== NO_MANAGER ? selectedManagerId : null,
  }).some(isInternMember);

  function handleOpenChange(next: boolean) {
    if (!next) {
      reset(defaultValues);
      setSubmitError(null);
    }
    onOpenChange(next);
  }

  async function onSubmit(values: ProjectFormValues) {
    setSubmitError(null);
    if (!uid) return;
    const memberIds = values.memberIds.includes(uid) ? values.memberIds : [uid, ...values.memberIds];
    const managerId = values.managerId && values.managerId !== NO_MANAGER ? values.managerId : null;
    const repositoryUrl = values.repositoryUrl?.trim() || null;
    const repoError = repositoryUrlError({ repositoryUrl, assigneeIds: projectAssigneeIds({ memberIds, managerId }), isIntern: isInternMember });
    if (repoError) {
      setError("repositoryUrl", { message: repoError }, { shouldFocus: true });
      return;
    }

    try {
      if (isEditing && project) {
        await updateProject(project.id, { ...values, memberIds, managerId, repositoryUrl });
        onSaved({ ...project, ...values, memberIds, managerId, repositoryUrl });
      } else {
        const created = await createProject({ ...values, memberIds, managerId, repositoryUrl });
        onSaved(created);
      }
      onOpenChange(false);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Failed to save project.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Project" : "Create Project"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update this project's details." : "Set up a new project. You can edit these details later."}
          </DialogDescription>
        </DialogHeader>

        <form id="create-project-form" noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {submitError && (
            <div className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="project-name">Project name</Label>
            <Input id="project-name" placeholder="e.g. Partner API Integration" {...register("name")} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="project-description">Description</Label>
            <Textarea
              id="project-description"
              placeholder="What is this project about?"
              rows={3}
              className="max-h-72 overflow-y-auto"
              {...register("description")}
            />
            {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="status">Status</Label>
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={(value) => field.onChange(value ?? "Planning")}>
                    <SelectTrigger id="status" className="w-full">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((status) => (
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
              <Label htmlFor="priority">Priority</Label>
              <Controller
                control={control}
                name="priority"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={(value) => field.onChange(value ?? "Medium")}>
                    <SelectTrigger id="priority" className="w-full">
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
              <Label htmlFor="start-date">Start date</Label>
              <Input id="start-date" type="date" {...register("startDate")} />
              {errors.startDate && <p className="text-xs text-destructive">{errors.startDate.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="due-date">Expected completion</Label>
              <Input id="due-date" type="date" {...register("dueDate")} />
              {errors.dueDate && <p className="text-xs text-destructive">{errors.dueDate.message}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="team">Team</Label>
            <Controller
              control={control}
              name="teamId"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(value) => field.onChange(value ?? "")}
                  items={selectItems(teams, (t) => t.id, (t) => t.name, { value: field.value, unresolvedLabel: "Unknown team" })}
                >
                  <SelectTrigger id="team" className="w-full">
                    <SelectValue placeholder="Select a team" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.teamId && <p className="text-xs text-destructive">{errors.teamId.message}</p>}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Project owner</Label>
              <div className="flex h-9 items-center gap-2 rounded-lg border border-input bg-muted/40 px-3 text-sm">
                <Avatar size="sm">
                  <AvatarFallback>{initials(ownerName)}</AvatarFallback>
                </Avatar>
                <span className="truncate text-foreground">{ownerName}</span>
                {!isEditing && <span className="text-xs text-muted-foreground">(You)</span>}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="manager">Project manager</Label>
              <Controller
                control={control}
                name="managerId"
                render={({ field }) => (
                  <Select
                    value={field.value || NO_MANAGER}
                    onValueChange={(value) => field.onChange(value === NO_MANAGER ? undefined : value)}
                    items={selectItems(members, (m) => m.id, (m) => m.name, {
                      extra: { [NO_MANAGER]: "No manager assigned" },
                      value: field.value,
                      unresolvedLabel: "Unknown user",
                    })}
                  >
                    <SelectTrigger id="manager" className="w-full">
                      <SelectValue placeholder="Select a manager" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_MANAGER}>No manager assigned</SelectItem>
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
          </div>

          <div className="space-y-1.5">
            <Label>Team members</Label>
            <div className="grid grid-cols-1 gap-x-4 gap-y-2 rounded-lg border border-input p-3 sm:grid-cols-2">
              {members.map((member) => {
                const checked = selectedMemberIds?.includes(member.id) ?? false;
                return (
                  <label key={member.id} className="flex items-center gap-2 text-sm text-foreground">
                    <Controller
                      control={control}
                      name="memberIds"
                      render={({ field }) => (
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(next) => {
                            const current = field.value ?? [];
                            field.onChange(
                              next ? [...current, member.id] : current.filter((id) => id !== member.id)
                            );
                          }}
                        />
                      )}
                    />
                    {member.name}
                  </label>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Label htmlFor="project-requirements">Project Requirements</Label>
              <Badge variant="secondary">Optional</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Add the scope, technical requirements, deliverables, instructions, and expectations for this project.
            </p>
            <Textarea
              id="project-requirements"
              placeholder="Enter the project requirements, scope, deliverables, technologies, instructions, deadlines, and expectations..."
              className="min-h-[200px] max-h-[28rem] overflow-y-auto"
              {...register("requirements")}
            />
            {errors.requirements && <p className="text-xs text-destructive">{errors.requirements.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="project-repository">
              Repository URL{" "}
              <span className={repositoryRequired ? "text-destructive" : "font-normal text-muted-foreground"}>
                {repositoryRequired ? "(required — an intern is assigned)" : "(optional)"}
              </span>
            </Label>
            <Input
              id="project-repository"
              type="url"
              inputMode="url"
              placeholder="https://github.com/org/repo"
              aria-invalid={Boolean(errors.repositoryUrl)}
              aria-required={repositoryRequired}
              {...register("repositoryUrl")}
            />
            {errors.repositoryUrl ? (
              <p className="text-xs text-destructive">{errors.repositoryUrl.message}</p>
            ) : (
              <p className="text-xs text-muted-foreground">Shown to everyone assigned to the project.</p>
            )}
          </div>

          {canConfigureWorkVerification && (
            <div className="space-y-3 rounded-lg border border-border p-3.5">
              <label className="flex cursor-pointer items-start gap-2.5">
                <Controller
                  control={control}
                  name="workVerificationEnabled"
                  render={({ field }) => (
                    <Checkbox checked={field.value ?? false} onCheckedChange={(next) => field.onChange(Boolean(next))} className="mt-0.5" />
                  )}
                />
                <span>
                  <span className="block text-sm font-medium text-foreground">Enable Work Verification</span>
                  <span className="block text-xs text-muted-foreground">
                    Members submit a daily work update with optional evidence; you or the project manager review it. Off
                    by default — existing project behavior is unaffected.
                  </span>
                </span>
              </label>
            </div>
          )}
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="create-project-form" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : isEditing ? "Save changes" : "Create Project"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
