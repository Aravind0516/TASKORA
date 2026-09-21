import { cn } from "@/lib/utils";
import type { ProjectHealth } from "@/lib/project-health";

const HEALTH_STYLES: Record<ProjectHealth["status"], string> = {
  HEALTHY: "bg-success/10 text-success",
  // Amber keeps its existing Tailwind pair rather than a semantic token — see
  // status-badge.tsx's comment on why bg-warning/10 + text-warning-foreground
  // fails contrast in dark mode.
  AT_RISK: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  CRITICAL: "bg-danger/10 text-danger",
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
