import { cn } from "@/lib/utils";
import { formatDate, daysUntil } from "@/lib/format";
import { useWorkspace } from "@/components/workspace/workspace-provider";
import type { Project } from "@/types/project";
import type { ActivityLogEntry } from "@/types/activity";

interface TimelineEvent {
  date: string;
  label: string;
  future: boolean;
}

function buildEvents(
  project: Project,
  activity: ActivityLogEntry[],
  getMemberById: (id: string) => { name: string } | undefined
): TimelineEvent[] {
  const events: TimelineEvent[] = [
    { date: project.createdAt, label: "Project created", future: false },
    { date: project.startDate, label: "Project started", future: daysUntil(project.startDate) > 0 },
    ...activity.map((entry) => {
      const actor = getMemberById(entry.actorId);
      return {
        date: entry.createdAt,
        label: `${actor?.name ?? entry.actorName} ${entry.action.replace(/_/g, " ")} "${entry.entityName}"`,
        future: false,
      };
    }),
    {
      date: project.dueDate,
      label: project.status === "Completed" ? "Project completed" : "Target completion",
      future: project.status !== "Completed" && daysUntil(project.dueDate) >= 0,
    },
  ];

  return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export function ProjectTimeline({ project, activity }: { project: Project; activity: ActivityLogEntry[] }) {
  const { getMemberById } = useWorkspace();
  const events = buildEvents(project, activity, getMemberById);

  return (
    <ol className="space-y-0">
      {events.map((event, index) => (
        <li key={`${event.date}-${index}`} className="relative flex gap-3 pb-5 last:pb-0">
          {index !== events.length - 1 && (
            <span className="absolute top-3 left-[5px] h-full w-px bg-border" aria-hidden />
          )}
          <span
            className={cn(
              "relative z-10 mt-1.5 size-[11px] shrink-0 rounded-full",
              event.future ? "border-2 border-dashed border-muted-foreground bg-background" : "bg-primary"
            )}
            aria-hidden
          />
          <div className="min-w-0 flex-1 pt-0">
            <p className={cn("text-sm", event.future ? "text-muted-foreground" : "text-foreground")}>
              {event.label}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatDate(event.date)}
              {event.future && " · upcoming"}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
