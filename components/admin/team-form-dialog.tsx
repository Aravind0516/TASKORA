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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { platformTeamFormSchema, type PlatformTeamFormValues } from "@/lib/validation/platform-team.schema";
import type { PlatformTeam, PlatformUser } from "@/types/platform";
import { selectItems } from "@/lib/select-items";

// Sentinel item value for "no Team Lead" — Select items can't use an empty
// string as their value, so this is translated to/from "" at the form
// boundary (buildFormValues / onSubmit below).
const NO_LEAD = "none";

interface TeamFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitTeam: (values: PlatformTeamFormValues, memberIds: string[]) => void;
  users: PlatformUser[];
  team?: PlatformTeam | null;
}

function buildFormValues(team?: PlatformTeam | null): PlatformTeamFormValues {
  return { name: team?.name ?? "", description: team?.description ?? "", leadId: team?.leadId || NO_LEAD };
}

export function TeamFormDialog({ open, onOpenChange, onSubmitTeam, users, team }: TeamFormDialogProps) {
  const isEditing = Boolean(team);
  const hasUsers = users.length > 0;

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PlatformTeamFormValues>({
    resolver: zodResolver(platformTeamFormSchema),
    defaultValues: buildFormValues(team),
  });

  useEffect(() => {
    if (!open) return;
    reset(buildFormValues(team));
  }, [open, team, reset]);

  function handleOpenChange(next: boolean) {
    if (!next) reset(buildFormValues(null));
    onOpenChange(next);
  }

  function onSubmit(values: PlatformTeamFormValues) {
    const leadId = values.leadId && values.leadId !== NO_LEAD ? values.leadId : "";
    const memberIds =
      !leadId || team?.memberIds.includes(leadId)
        ? (team?.memberIds ?? [])
        : [leadId, ...(team?.memberIds ?? [])];
    onSubmitTeam({ ...values, description: values.description ?? "", leadId }, memberIds);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Team" : "Create Team"}</DialogTitle>
          <DialogDescription>{isEditing ? "Update this team's details." : "Set up a new team in your organization."}</DialogDescription>
        </DialogHeader>

        <form id="team-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="team-name">Team name</Label>
            <Input id="team-name" placeholder="e.g. Platform Engineering" {...register("name")} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="team-description">Description</Label>
            <Textarea id="team-description" rows={3} placeholder="What does this team own?" {...register("description")} />
            {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="team-lead">Team lead</Label>
            {hasUsers ? (
              <Controller
                control={control}
                name="leadId"
                render={({ field }) => (
                  <Select
                    value={field.value || NO_LEAD}
                    onValueChange={(value) => field.onChange(value ?? NO_LEAD)}
                    items={selectItems(users, (u) => u.id, (u) => u.name, {
                      extra: { [NO_LEAD]: "No team lead" },
                      value: field.value,
                      unresolvedLabel: "Unknown user",
                    })}
                  >
                    <SelectTrigger id="team-lead" className="w-full">
                      <SelectValue placeholder="Select a team lead" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_LEAD}>No team lead</SelectItem>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            ) : (
              <p className="rounded-lg bg-muted px-3.5 py-2.5 text-xs text-muted-foreground">
                Add a team member first to assign a Team Lead.
              </p>
            )}
            {errors.leadId && <p className="text-xs text-destructive">{errors.leadId.message}</p>}
          </div>
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="team-form" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : isEditing ? "Save changes" : "Create Team"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
