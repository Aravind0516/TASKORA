"use client";

import { useEffect } from "react";
import { useForm, useWatch, Controller } from "react-hook-form";
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
import { platformProjectFormSchema, type PlatformProjectFormValues } from "@/lib/validation/platform-project.schema";
import { initials } from "@/lib/format";
import type { PlatformProject, PlatformProjectStatus, PlatformPriority, PlatformTeam, PlatformUser } from "@/types/platform";
import { selectItems } from "@/lib/select-items";

const STATUSES: PlatformProjectStatus[] = ["Planning", "Active", "On Hold", "Completed"];
const PRIORITIES: PlatformPriority[] = ["Low", "Medium", "High", "Critical"];

interface ProjectFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitProject: (values: PlatformProjectFormValues) => void;
  teams: PlatformTeam[];
  users: PlatformUser[];
  project?: PlatformProject | null;
  /** The authenticated Admin creating/editing this project — always its owner. Never a selectable field; see PROJECT OWNER fix. */
  ownerName: string;
}

// Sentinel item value for "no manager assigned" — Select items can't use an
// empty string as their value, so this is translated to/from undefined at
// the form boundary, same pattern as Team Lead in team-form-dialog.tsx.
const NO_MANAGER = "none";

const defaultValues: PlatformProjectFormValues = {
  name: "",
  description: "",
  teamId: "",
  memberIds: [],
  managerId: undefined,
  status: "Planning",
  priority: "Medium",
  startDate: "",
  dueDate: "",
  repositoryUrl: "",
  workVerificationEnabled: false,
  requirements: "",
};

function projectToFormValues(project: PlatformProject): PlatformProjectFormValues {
  return {
    name: project.name,
    description: project.description,
    teamId: project.teamId,
    memberIds: project.memberIds,
    managerId: project.managerId ?? undefined,
    status: project.status,
    priority: project.priority,
    startDate: project.startDate,
    dueDate: project.dueDate,
    repositoryUrl: project.repositoryUrl ?? "",
    workVerificationEnabled: project.workVerificationEnabled,
    requirements: project.requirements ?? "",
  };
}

export function ProjectFormDialog({ open, onOpenChange, onSubmitProject, teams, users, project, ownerName }: ProjectFormDialogProps) {
  const isEditing = Boolean(project);

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<PlatformProjectFormValues>({
    resolver: zodResolver(platformProjectFormSchema),
    defaultValues: project ? projectToFormValues(project) : defaultValues,
  });

  const selectedTeamId = useWatch({ control, name: "teamId" });
  const selectedTeam = teams.find((t) => t.id === selectedTeamId);
  const teamMembers = selectedTeam ? users.filter((u) => selectedTeam.memberIds.includes(u.id)) : [];

  useEffect(() => {
    if (!open) return;
    reset(project ? projectToFormValues(project) : defaultValues);
  }, [open, project, reset]);

  function handleOpenChange(next: boolean) {
    if (!next) reset(defaultValues);
    onOpenChange(next);
  }

  function onSubmit(values: PlatformProjectFormValues) {
    onSubmitProject({ ...values, managerId: values.managerId && values.managerId !== NO_MANAGER ? values.managerId : undefined });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Project" : "Create Project"}</DialogTitle>
          <DialogDescription>{isEditing ? "Update this project's details." : "Set up a new project for your organization."}</DialogDescription>
        </DialogHeader>

        <form id="platform-project-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="pp-name">Project name</Label>
            <Input id="pp-name" placeholder="e.g. Q4 Platform Migration" {...register("name")} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pp-description">Description</Label>
            <Textarea id="pp-description" rows={3} placeholder="What is this project about?" {...register("description")} />
            {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="pp-team">Team</Label>
              <Controller
                control={control}
                name="teamId"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    items={selectItems(teams, (t) => t.id, (t) => t.name, { value: field.value, unresolvedLabel: "Unknown team" })}
                    onValueChange={(value) => {
                      field.onChange(value ?? "");
                      setValue("memberIds", []);
                    }}
                  >
                    <SelectTrigger id="pp-team" className="w-full">
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
          </div>

          {selectedTeam && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="pp-manager">Project manager</Label>
                {teamMembers.length === 0 ? (
                  <p className="rounded-lg bg-muted px-3.5 py-2.5 text-xs text-muted-foreground">
                    Add members to {selectedTeam.name} first to assign a Project Manager.
                  </p>
                ) : (
                  <Controller
                    control={control}
                    name="managerId"
                    render={({ field }) => (
                      <Select
                        value={field.value || NO_MANAGER}
                        onValueChange={(value) => field.onChange(value === NO_MANAGER ? undefined : value)}
                        items={selectItems(teamMembers, (m) => m.id, (m) => m.name, {
                          extra: { [NO_MANAGER]: "No manager assigned" },
                          value: field.value,
                          unresolvedLabel: "Unknown user",
                        })}
                      >
                        <SelectTrigger id="pp-manager" className="w-full">
                          <SelectValue placeholder="Select a project manager" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NO_MANAGER}>No manager assigned</SelectItem>
                          {teamMembers.map((member) => (
                            <SelectItem key={member.id} value={member.id}>
                              {member.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                )}
                <p className="text-xs text-muted-foreground">Gets elevated permissions on this project only — not an account-wide role.</p>
              </div>

              <div className="space-y-1.5">
                <Label>Project members</Label>
                {teamMembers.length === 0 ? (
                  <p className="rounded-lg bg-muted px-3.5 py-2.5 text-xs text-muted-foreground">
                    {selectedTeam.name} has no members yet — assign people to it from Admin Teams first.
                  </p>
                ) : (
                  <Controller
                    control={control}
                    name="memberIds"
                    render={({ field }) => (
                      <div className="max-h-44 space-y-1 overflow-y-auto rounded-lg border border-input p-2">
                        {teamMembers.map((member) => {
                          const checked = (field.value ?? []).includes(member.id);
                          return (
                            <label
                              key={member.id}
                              className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-muted"
                            >
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(next) => {
                                  const current = field.value ?? [];
                                  field.onChange(next ? [...current, member.id] : current.filter((id) => id !== member.id));
                                }}
                              />
                              <span className="min-w-0 flex-1 truncate text-sm text-foreground">{member.name}</span>
                              {member.functionalRole && (
                                <span className="shrink-0 text-xs text-muted-foreground">{member.functionalRole}</span>
                              )}
                            </label>
                          );
                        })}
                      </div>
                    )}
                  />
                )}
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Label htmlFor="pp-requirements">Project Requirements</Label>
              <Badge variant="secondary">Optional</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Define the project scope, requirements, deliverables, technologies, instructions, expectations, and other
              important information for the assigned team.
            </p>
            <Textarea
              id="pp-requirements"
              placeholder="Enter the project requirements, scope, deliverables, technologies, instructions, deadlines, and expectations..."
              className="min-h-[200px]"
              {...register("requirements")}
            />
            {errors.requirements && <p className="text-xs text-destructive">{errors.requirements.message}</p>}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="pp-status">Status</Label>
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={(value) => field.onChange(value ?? "Planning")}>
                    <SelectTrigger id="pp-status" className="w-full">
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
              <Label htmlFor="pp-priority">Priority</Label>
              <Controller
                control={control}
                name="priority"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={(value) => field.onChange(value ?? "Medium")}>
                    <SelectTrigger id="pp-priority" className="w-full">
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
              <Label htmlFor="pp-start">Start date</Label>
              <Input id="pp-start" type="date" {...register("startDate")} />
              {errors.startDate && <p className="text-xs text-destructive">{errors.startDate.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pp-due">Due date</Label>
              <Input id="pp-due" type="date" {...register("dueDate")} />
              {errors.dueDate && <p className="text-xs text-destructive">{errors.dueDate.message}</p>}
            </div>
          </div>

          <div className="space-y-3 rounded-lg border border-border p-3.5">
            <label className="flex cursor-pointer items-start gap-2.5">
              <Controller
                control={control}
                name="workVerificationEnabled"
                render={({ field }) => <Checkbox checked={field.value ?? false} onCheckedChange={(next) => field.onChange(Boolean(next))} className="mt-0.5" />}
              />
              <span>
                <span className="block text-sm font-medium text-foreground">Enable Work Verification</span>
                <span className="block text-xs text-muted-foreground">
                  Members submit a daily work update with optional evidence; you or the project manager review it. Off by
                  default — existing project behavior is unaffected.
                </span>
              </span>
            </label>
            <div className="space-y-1.5">
              <Label htmlFor="pp-repo">Repository URL (optional)</Label>
              <Input id="pp-repo" placeholder="https://github.com/org/repo" {...register("repositoryUrl")} />
              <p className="text-xs text-muted-foreground">Shown as context next to submitted evidence — never fetched or verified automatically.</p>
            </div>
          </div>
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="platform-project-form" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : isEditing ? "Save changes" : "Create Project"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
