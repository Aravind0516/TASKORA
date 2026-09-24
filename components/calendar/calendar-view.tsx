"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, FolderKanban, ListChecks, Users } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/components/workspace/workspace-provider";
import { dateKey, dueDateKey, shiftAnchor, startOfWeek, type CalendarViewMode } from "@/lib/calendar";


interface DayEntry {
  key: string;
  kind: "task" | "project" | "meeting";
  label: string;
  href: string;
  overdue: boolean;
}


/**
 * Calendar is a pure derived view over tasks/projects/meetings already
 * loaded by useWorkspace() — no dedicated Firestore collection, no extra
 * reads. Organization/permission boundaries come for free from those same
 * subscriptions (org-scoped tasks/projects, self-or-participant-scoped
 * meetings), so this component never needs its own security logic.
 */
export function CalendarView() {
  const { tasks, projects, meetings, loaded, errors } = useWorkspace();
  const [viewMode, setViewMode] = useState<CalendarViewMode>("month");
  const [anchor, setAnchor] = useState(() => new Date());

  const loading = !loaded.tasks || !loaded.projects || !loaded.meetings;
  const todayKey = dateKey(new Date());

  const entriesByDay = useMemo(() => {
    const map = new Map<string, DayEntry[]>();
    const add = (key: string, entry: DayEntry) => {
      const list = map.get(key) ?? [];
      list.push(entry);
      map.set(key, list);
    };

    for (const task of tasks) {
      if (!task.dueDate) continue;
      const key = dueDateKey(task.dueDate);
      add(key, {
        key: `task-${task.id}`,
        kind: "task",
        label: task.title,
        href: "/tasks",
        overdue: task.status !== "Completed" && key < todayKey,
      });
    }
    for (const project of projects) {
      if (!project.dueDate || project.archived) continue;
      const key = dueDateKey(project.dueDate);
      add(key, {
        key: `project-${project.id}`,
        kind: "project",
        label: project.name,
        href: `/projects/${project.id}`,
        overdue: project.status !== "Completed" && key < todayKey,
      });
    }
    for (const meeting of meetings) {
      if (meeting.status === "Cancelled") continue;
      const start = new Date(meeting.startAt);
      const key = dateKey(start);
      const timeLabel = start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
      add(key, { key: `meeting-${meeting.id}`, kind: "meeting", label: `${timeLabel} ${meeting.title}`, href: "/meetings", overdue: false });
    }
    return map;
  }, [tasks, projects, meetings, todayKey]);

  const days = useMemo(() => {
    if (viewMode === "week") {
      const start = startOfWeek(anchor);
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        return d;
      });
    }
    const firstOfMonth = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const gridStart = startOfWeek(firstOfMonth);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      return d;
    });
  }, [viewMode, anchor]);

  function goPrev() {
    setAnchor(shiftAnchor(anchor, viewMode, -1));
  }
  function goNext() {
    setAnchor(shiftAnchor(anchor, viewMode, 1));
  }
  function goToday() {
    setAnchor(new Date());
  }

  const headerLabel =
    viewMode === "month"
      ? anchor.toLocaleDateString("en-US", { month: "long", year: "numeric" })
      : `Week of ${startOfWeek(anchor).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;

  if (loading) {
    return (
      <div>
        <PageHeader title="Calendar" description="Task due dates, project deadlines, and meetings" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Calendar"
        description="Task due dates, project deadlines, and meetings"
        actions={
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="sm" onClick={goToday}>
              Today
            </Button>
            <Button variant={viewMode === "month" ? "secondary" : "outline"} size="sm" onClick={() => setViewMode("month")}>
              Month
            </Button>
            <Button variant={viewMode === "week" ? "secondary" : "outline"} size="sm" onClick={() => setViewMode("week")}>
              Week
            </Button>
          </div>
        }
      />

      {(errors.tasks || errors.projects || errors.meetings) && (
        <p className="mb-3 text-sm text-destructive">Some calendar data couldn&apos;t be loaded — results may be incomplete.</p>
      )}

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">{headerLabel}</h2>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon-sm" aria-label="Previous" onClick={goPrev}>
            <ChevronLeft />
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label="Next" onClick={goNext}>
            <ChevronRight />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg bg-border text-center text-xs font-medium text-muted-foreground">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label) => (
          <div key={label} className="bg-muted py-1.5">
            {label}
          </div>
        ))}
      </div>

      <div className={cn("grid grid-cols-7 gap-px overflow-hidden rounded-b-lg bg-border", viewMode === "month" ? "auto-rows-[minmax(5.5rem,auto)]" : "auto-rows-[minmax(9rem,auto)]")}>
        {days.map((day) => {
          const key = dateKey(day);
          const entries = entriesByDay.get(key) ?? [];
          const isToday = key === todayKey;
          const isCurrentMonth = viewMode === "week" || day.getMonth() === anchor.getMonth();
          const visibleEntries = viewMode === "week" ? entries : entries.slice(0, 3);

          return (
            <div
              key={key}
              className={cn("min-w-0 bg-background p-1.5 sm:p-2", !isCurrentMonth && "bg-muted/40 text-muted-foreground/60")}
            >
              <div
                className={cn(
                  "mb-1 inline-flex size-5 items-center justify-center rounded-full text-xs",
                  isToday ? "bg-primary font-semibold text-primary-foreground" : "text-foreground"
                )}
              >
                {day.getDate()}
              </div>
              <div className="space-y-1">
                {visibleEntries.map((entry) => (
                  <Link
                    key={entry.key}
                    href={entry.href}
                    className={cn(
                      "flex items-center gap-1 truncate rounded px-1 py-0.5 text-[11px] hover:opacity-80",
                      entry.overdue
                        ? "bg-danger/10 text-danger"
                        : entry.kind === "task"
                          ? "bg-info/10 text-info"
                          : entry.kind === "project"
                            ? "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300"
                            : "bg-success/10 text-success"
                    )}
                  >
                    {entry.kind === "task" ? (
                      <ListChecks className="hidden size-3 shrink-0 sm:block" />
                    ) : entry.kind === "project" ? (
                      <FolderKanban className="hidden size-3 shrink-0 sm:block" />
                    ) : (
                      <Users className="hidden size-3 shrink-0 sm:block" />
                    )}
                    <span className="truncate">{entry.label}</span>
                  </Link>
                ))}
                {viewMode === "month" && entries.length > 3 && (
                  <p className="px-1 text-[10px] text-muted-foreground">+{entries.length - 3} more</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
