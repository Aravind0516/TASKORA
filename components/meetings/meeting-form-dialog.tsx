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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { meetingFormSchema, type MeetingFormValues } from "@/lib/validation/meeting.schema";
import { TimeInput12h } from "@/components/meetings/time-input-12h";
import { useWorkspace } from "@/components/workspace/workspace-provider";
import { useAuth } from "@/components/auth/auth-provider";
import type { Meeting } from "@/types/meeting";
import { selectItems } from "@/lib/select-items";

const NO_PROJECT = "none";

interface MeetingFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  meeting?: Meeting | null;
}

function splitIso(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

function toIso(date: string, time: string): string {
  return new Date(`${date}T${time}`).toISOString();
}

function buildDefaultValues(meeting?: Meeting | null): MeetingFormValues {
  if (!meeting) {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    return { title: "", description: "", projectId: undefined, participantIds: [], date: today, startTime: "10:00", endTime: "10:30", notes: "", meetingLink: "" };
  }
  const start = splitIso(meeting.startAt);
  const end = splitIso(meeting.endAt);
  return {
    title: meeting.title,
    description: meeting.description,
    projectId: meeting.projectId ?? undefined,
    participantIds: meeting.participantIds,
    date: start.date,
    startTime: start.time,
    endTime: end.time,
    notes: meeting.notes,
    meetingLink: meeting.meetingLink ?? "",
  };
}

export function MeetingFormDialog({ open, onOpenChange, onSaved, meeting }: MeetingFormDialogProps) {
  const { role } = useAuth();
  const { uid, members, projects, createMeeting, updateMeeting } = useWorkspace();
  const isEditing = Boolean(meeting);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const isPrivileged = role === "admin" || role === "super_admin";
  // firestore.rules only lets a non-admin creator schedule a meeting tied to
  // a project they actually manage — never a project-less (organization-
  // wide) one. Restricting the picker to exactly that set (and dropping the
  // "No related project" option) means a manager can never even select a
  // combination the rule would go on to deny.
  const selectableProjects = isPrivileged ? projects : projects.filter((p) => p.managerId === uid);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<MeetingFormValues>({
    resolver: zodResolver(meetingFormSchema),
    defaultValues: buildDefaultValues(meeting),
  });

  function handleOpenChange(next: boolean) {
    if (!next) {
      reset(buildDefaultValues(meeting));
      setSubmitError(null);
    }
    onOpenChange(next);
  }

  function toggleParticipant(selected: string[], memberId: string, checked: boolean, onChange: (next: string[]) => void) {
    const next = checked ? [...selected, memberId] : selected.filter((id) => id !== memberId);
    onChange(next);
  }

  async function onSubmit(values: MeetingFormValues) {
    setSubmitError(null);
    try {
      const payload = {
        title: values.title,
        description: values.description,
        projectId: values.projectId && values.projectId !== NO_PROJECT ? values.projectId : null,
        participantIds: values.participantIds,
        startAt: toIso(values.date, values.startTime),
        endAt: toIso(values.date, values.endTime),
        notes: values.notes,
        meetingLink: values.meetingLink ? values.meetingLink : null,
      };
      if (isEditing && meeting) {
        await updateMeeting(meeting.id, payload);
      } else {
        await createMeeting(payload);
      }
      onSaved();
      onOpenChange(false);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Failed to save meeting.");
    }
  }

  const otherMembers = members.filter((m) => m.id !== uid);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Meeting" : "Schedule Meeting"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update this meeting's details." : "Coordinate a meeting with your team."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {submitError && (
            <div className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="meeting-title">Title</Label>
            <Input id="meeting-title" placeholder="e.g. Weekly Product Review" {...register("title")} />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="meeting-description">Description / Agenda</Label>
            <Textarea id="meeting-description" rows={2} {...register("description")} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="meeting-project">Related project{isPrivileged ? "" : " (required)"}</Label>
            <Controller
              control={control}
              name="projectId"
              render={({ field }) => (
                <Select
                  value={field.value || (isPrivileged ? NO_PROJECT : selectableProjects[0]?.id)}
                  onValueChange={(value) => field.onChange(value === NO_PROJECT ? undefined : value)}
                  items={selectItems(selectableProjects, (p) => p.id, (p) => p.name, {
                    extra: { [NO_PROJECT]: "No related project" },
                    value: field.value,
                    unresolvedLabel: "Unknown project",
                  })}
                >
                  <SelectTrigger id="meeting-project" className="w-full">
                    <SelectValue placeholder={isPrivileged ? "No related project" : "Select a project you manage"} />
                  </SelectTrigger>
                  <SelectContent>
                    {isPrivileged && <SelectItem value={NO_PROJECT}>No related project</SelectItem>}
                    {selectableProjects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {!isPrivileged && (
              <p className="text-xs text-muted-foreground">You can schedule meetings for projects you manage.</p>
            )}
          </div>

          {/*
            Date, Start time, and End time each get their OWN full-width row
            — never crammed side-by-side. A 3-column grid here previously
            gave each Time cell only ~144px inside this max-w-lg dialog,
            while TimeInput12h's Hour+Minute+AM/PM row needs ~230-280px to
            render without overflowing — on any desktop-width screen the
            Minute input and AM/PM selector were pushed past the dialog's
            right edge (grid tracks use Tailwind's minmax(0, 1fr), which
            shrinks the track but NOT the non-wrapping flex row inside it,
            so the overflow was real, not just visually tight). Stacking
            guarantees the full dialog width for the row regardless of
            viewport, which is the only genuinely responsive fix — shrinking
            TimeInput12h's own controls further would just reproduce the
            same problem on a narrower dialog.
          */}
          <div className="space-y-1.5">
            <Label htmlFor="meeting-date">Date</Label>
            <Input id="meeting-date" type="date" className="max-w-[220px]" {...register("date")} />
            {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="meeting-start">Start time</Label>
            <Controller
              control={control}
              name="startTime"
              render={({ field }) => (
                <TimeInput12h id="meeting-start" value={field.value} onChange={field.onChange} aria-label="Start time" />
              )}
            />
            {errors.startTime && <p className="text-xs text-destructive">{errors.startTime.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="meeting-end">End time</Label>
            <Controller
              control={control}
              name="endTime"
              render={({ field }) => (
                <TimeInput12h id="meeting-end" value={field.value} onChange={field.onChange} aria-label="End time" />
              )}
            />
            {errors.endTime && <p className="text-xs text-destructive">{errors.endTime.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="meeting-link">Meeting link (optional)</Label>
            <Input id="meeting-link" placeholder="https://..." {...register("meetingLink")} />
            {errors.meetingLink && <p className="text-xs text-destructive">{errors.meetingLink.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="meeting-notes">Notes</Label>
            <Textarea id="meeting-notes" rows={2} {...register("notes")} />
          </div>

          <div className="space-y-1.5">
            <Label>Participants</Label>
            {otherMembers.length === 0 ? (
              <p className="text-xs text-muted-foreground">No other team members to invite yet.</p>
            ) : (
              <Controller
                control={control}
                name="participantIds"
                render={({ field }) => (
                  <div className="max-h-40 space-y-1.5 overflow-y-auto rounded-md border border-border p-2.5">
                    {otherMembers.map((member) => (
                      <label key={member.id} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={field.value.includes(member.id)}
                          onCheckedChange={(checked) => toggleParticipant(field.value, member.id, Boolean(checked), field.onChange)}
                        />
                        <span className="truncate">{member.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              />
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : isEditing ? "Save changes" : "Schedule Meeting"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
