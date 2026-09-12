import { FolderPlus, FolderEdit, ListPlus, ArrowRightLeft, CheckCircle2, Activity } from "lucide-react";
import type { ActivityLogEntry, ActivityType } from "@/types/activity";
import { useWorkspace } from "@/components/workspace/workspace-provider";
import { timeAgo } from "@/lib/format";

const ACTIVITY_ICON: Partial<Record<ActivityType, typeof FolderPlus>> = {
  project_created: FolderPlus,
  project_updated: FolderEdit,
  task_created: ListPlus,
  task_status_changed: ArrowRightLeft,
  task_completed: CheckCircle2,
};

const ACTION_LABELS: Partial<Record<ActivityType, string>> = {
  project_created: "created project",
  project_updated: "updated project",
  project_completed: "completed project",
  task_created: "created task",
  task_assigned: "assigned",
  task_status_changed: "updated",
  task_completed: "completed task",
};

export function RecentActivity({ entries }: { entries: ActivityLogEntry[] }) {
  const { getMemberById } = useWorkspace();

  return (
    <ul className="space-y-4">
      {entries.map((entry) => {
        const Icon = ACTIVITY_ICON[entry.action] ?? Activity;
        const actor = getMemberById(entry.actorId);

        return (
          <li key={entry.id} className="flex items-start gap-3">
            <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Icon className="size-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-foreground">
                <span className="font-medium">{actor?.name ?? entry.actorName}</span>{" "}
                <span className="text-muted-foreground">
                  {ACTION_LABELS[entry.action] ?? entry.action} <span className="font-medium text-foreground">{entry.entityName}</span>
                </span>
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">{timeAgo(entry.createdAt)}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
