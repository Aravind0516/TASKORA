"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarClock, MoreHorizontal, Pencil, Plus, Trash2, Users, Video, XCircle } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarGroup } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MeetingFormDialog } from "@/components/meetings/meeting-form-dialog";
import { useWorkspace } from "@/components/workspace/workspace-provider";
import { initials, isOverdue } from "@/lib/format";
import type { Meeting } from "@/types/meeting";

function isPastMeeting(meeting: Meeting): boolean {
  return meeting.status === "Cancelled" || isOverdue(meeting.endAt, false);
}

function formatMeetingTime(meeting: Meeting): string {
  const start = new Date(meeting.startAt);
  const end = new Date(meeting.endAt);
  const dateLabel = start.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  const timeLabel = (d: Date) => d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${dateLabel} · ${timeLabel(start)}–${timeLabel(end)}`;
}

export function MeetingsView() {
  const { uid, meetings, getMemberById, getProjectById, loaded, errors, retry, deleteMeeting, updateMeetingStatus } = useWorkspace();
  const [formOpen, setFormOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);

  const loading = !loaded.meetings || !loaded.members;
  const upcoming = meetings.filter((m) => !isPastMeeting(m));
  const past = meetings.filter(isPastMeeting);

  function openCreate() {
    setEditingMeeting(null);
    setFormOpen(true);
  }

  function openEdit(meeting: Meeting) {
    setEditingMeeting(meeting);
    setFormOpen(true);
  }

  async function handleCancel(meeting: Meeting) {
    try {
      await updateMeetingStatus(meeting.id, "Cancelled");
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Failed to cancel meeting.");
    }
  }

  async function handleDelete(meeting: Meeting) {
    const confirmed = window.confirm(`Delete "${meeting.title}"? This can't be undone.`);
    if (!confirmed) return;
    try {
      await deleteMeeting(meeting.id);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Failed to delete meeting.");
    }
  }

  function MeetingCard({ meeting }: { meeting: Meeting }) {
    const project = meeting.projectId ? getProjectById(meeting.projectId) : undefined;
    const organizer = getMemberById(meeting.organizerId);
    const participants = meeting.participantIds.map(getMemberById).filter(Boolean);
    const isOrganizer = meeting.organizerId === uid;

    return (
      <Card>
        <CardContent className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">{meeting.title}</h3>
              {meeting.status === "Cancelled" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-medium text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">
                  <XCircle className="size-3" /> Cancelled
                </span>
              )}
            </div>
            {meeting.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{meeting.description}</p>}
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <CalendarClock className="size-3.5" />
                {formatMeetingTime(meeting)}
              </span>
              {project && (
                <Link href={`/projects/${project.id}`} className="text-primary hover:underline">
                  {project.name}
                </Link>
              )}
              {meeting.meetingLink && (
                <a href={meeting.meetingLink} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                  <Video className="size-3.5" /> Join link
                </a>
              )}
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">Organized by {organizer?.name ?? "Unknown"}</p>
            {participants.length > 0 && (
              <div className="mt-2 flex items-center gap-1.5">
                <Users className="size-3.5 text-muted-foreground" />
                <AvatarGroup>
                  {participants.slice(0, 5).map((p) => (
                    <Avatar key={p!.id} size="sm">
                      <AvatarFallback>{initials(p!.name)}</AvatarFallback>
                    </Avatar>
                  ))}
                </AvatarGroup>
              </div>
            )}
          </div>

          {isOrganizer && (
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`Actions for ${meeting.title}`} className="shrink-0" />}>
                <MoreHorizontal />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => openEdit(meeting)}>
                  <Pencil />
                  Edit
                </DropdownMenuItem>
                {meeting.status !== "Cancelled" && (
                  <DropdownMenuItem onClick={() => handleCancel(meeting)}>
                    <XCircle />
                    Cancel
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem variant="destructive" onClick={() => handleDelete(meeting)}>
                  <Trash2 />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      <PageHeader
        title="Meetings"
        description="Meetings you organize or are invited to"
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus />
            Schedule Meeting
          </Button>
        }
      />

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      ) : errors.meetings ? (
        <ErrorState message={errors.meetings} onRetry={retry} />
      ) : meetings.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="No meetings yet"
          description="Schedule a meeting to coordinate with your team."
          actionLabel="Schedule Meeting"
          onAction={openCreate}
        />
      ) : (
        <div className="space-y-6">
          <div>
            <h2 className="mb-2.5 text-sm font-medium text-foreground">Upcoming ({upcoming.length})</h2>
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">No upcoming meetings.</p>
            ) : (
              <div className="space-y-2.5">
                {upcoming.map((meeting) => (
                  <MeetingCard key={meeting.id} meeting={meeting} />
                ))}
              </div>
            )}
          </div>

          {past.length > 0 && (
            <div>
              <h2 className="mb-2.5 text-sm font-medium text-foreground">Past ({past.length})</h2>
              <div className="space-y-2.5 opacity-70">
                {past.map((meeting) => (
                  <MeetingCard key={meeting.id} meeting={meeting} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <MeetingFormDialog key={editingMeeting?.id ?? "new"} open={formOpen} onOpenChange={setFormOpen} meeting={editingMeeting} onSaved={() => {}} />
    </div>
  );
}
