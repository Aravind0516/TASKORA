import { cn } from "@/lib/utils";
import type { ProjectHealth } from "@/lib/project-health";

const HEALTH_STYLES: Record<ProjectHealth["status"], string> = {
  HEALTHY: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  AT_RISK: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  CRITICAL: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
};

const HEALTH_LABEL: Record<ProjectHealth["status"], string> = {
  HEALTHY: "Healthy",
  AT_RISK: "At Risk",
  CRITICAL: "Critical",
};

/** Compact chip only — same visual language as StatusBadge/PriorityBadge, for project cards/tables. Pass `title` via the wrapping element if a tooltip is wanted; ProjectHealthExplanation below is the full reason+metrics version for detail views. */
export function ProjectHealthBadge({ health, className }: { health: ProjectHealth; className?: string }) {
  return (
    <span
      title={health.summary}
      className={cn(
        "inline-flex w-fit shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        HEALTH_STYLES[health.status],
        className
      )}
    >
      {HEALTH_LABEL[health.status]}
    </span>
  );
}

/** Badge + explanation sentence, for a project detail/overview context where there's room to explain why. */
export function ProjectHealthExplanation({ health, className }: { health: ProjectHealth; className?: string }) {
  return (
    <div className={cn("flex items-start gap-2.5", className)}>
      <ProjectHealthBadge health={health} className="mt-0.5" />
      <p className="text-sm text-muted-foreground">{health.summary}</p>
    </div>
  );
}
