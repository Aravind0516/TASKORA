"use client";

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { platformUserFormSchema, type PlatformUserFormValues } from "@/lib/validation/platform-user.schema";
import type { PersonStatus, PlatformTeam, PlatformUser } from "@/types/platform";
import { FUNCTIONAL_ROLES } from "@/types/user";
import { selectItems } from "@/lib/select-items";

const STATUSES: PersonStatus[] = ["Active", "Invited", "Suspended"];

// Sentinel item value for "no team assigned" — Select items can't use an
// empty string as their value, so this is translated to/from undefined at
// the form boundary.
const NO_TEAM = "none";
// Same pattern for "no functional role chosen yet."
const NO_FUNCTIONAL_ROLE = "none";

interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitUser: (values: PlatformUserFormValues) => void;
  teams: PlatformTeam[];
  user?: PlatformUser | null;
}

function buildDefaultValues(): PlatformUserFormValues {
  return { name: "", email: "", title: "", teamId: NO_TEAM, functionalRole: undefined, status: "Invited" };
}

function userToFormValues(user: PlatformUser): PlatformUserFormValues {
  return {
    name: user.name,
    email: user.email,
    title: user.title,
    teamId: user.teamIds[0] || NO_TEAM,
    functionalRole: user.functionalRole,
    status: user.status,
  };
}

export function UserFormDialog({ open, onOpenChange, onSubmitUser, teams, user }: UserFormDialogProps) {
  const isEditing = Boolean(user);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PlatformUserFormValues>({
    resolver: zodResolver(platformUserFormSchema),
    defaultValues: user ? userToFormValues(user) : buildDefaultValues(),
  });

  useEffect(() => {
    if (!open) return;
    reset(user ? userToFormValues(user) : buildDefaultValues());
  }, [open, user, reset]);

  function handleOpenChange(next: boolean) {
    if (!next) reset(buildDefaultValues());
    onOpenChange(next);
  }

  function onSubmit(values: PlatformUserFormValues) {
    // functionalRole never actually holds the NO_FUNCTIONAL_ROLE sentinel here —
    // the Select's onValueChange already converts it back to undefined below.
    onSubmitUser({ ...values, teamId: values.teamId && values.teamId !== NO_TEAM ? values.teamId : undefined });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit User" : "Add User"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update this member's details." : "Invite a new member to your organization."}
          </DialogDescription>
        </DialogHeader>

        <form id="user-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="user-name">Full name</Label>
            <Input id="user-name" placeholder="e.g. Jordan Lee" {...register("name")} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="user-email">Email</Label>
            <Input id="user-email" type="email" placeholder="jordan@company.com" {...register("email")} />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="user-title">Job title</Label>
            <Input id="user-title" placeholder="e.g. Product Designer" {...register("title")} />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="user-functional-role">Functional role</Label>
            <Controller
              control={control}
              name="functionalRole"
              render={({ field }) => (
                <Select
                  value={field.value || NO_FUNCTIONAL_ROLE}
                  onValueChange={(value) => field.onChange(value === NO_FUNCTIONAL_ROLE ? undefined : value)}
                >
                  <SelectTrigger id="user-functional-role" className="w-full">
                    <SelectValue placeholder="Select a functional role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_FUNCTIONAL_ROLE}>Not set</SelectItem>
                    {FUNCTIONAL_ROLES.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="user-team">Team</Label>
              {teams.length > 0 ? (
                <Controller
                  control={control}
                  name="teamId"
                  render={({ field }) => (
                    <Select
                      value={field.value || NO_TEAM}
                      onValueChange={(value) => field.onChange(value ?? NO_TEAM)}
                      items={selectItems(teams, (t) => t.id, (t) => t.name, {
                        extra: { [NO_TEAM]: "No team assigned" },
                        value: field.value,
                        unresolvedLabel: "Unknown team",
                      })}
                    >
                      <SelectTrigger id="user-team" className="w-full">
                        <SelectValue placeholder="No team" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_TEAM}>No team assigned</SelectItem>
                        {teams.map((team) => (
                          <SelectItem key={team.id} value={team.id}>
                            {team.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              ) : (
                <p className="rounded-lg bg-muted px-3.5 py-2.5 text-xs text-muted-foreground">
                  No teams created yet — you can assign a team later.
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="user-status">Status</Label>
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={(value) => field.onChange(value ?? "Invited")}>
                    <SelectTrigger id="user-status" className="w-full">
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
          </div>
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="user-form" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : isEditing ? "Save changes" : "Add User"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
