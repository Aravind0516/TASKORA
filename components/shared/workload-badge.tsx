import { cn } from "@/lib/utils";
import type { WorkloadLevel } from "@/lib/workload";

const WORKLOAD_STYLES: Record<WorkloadLevel, string> = {
  LOW: "bg-muted text-muted-foreground",
  NORMAL: "bg-success/10 text-success",
  HIGH: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  OVERLOADED: "bg-danger/10 text-danger",
};

const WORKLOAD_LABEL: Record<WorkloadLevel, string> = {
  LOW: "Low",
  NORMAL: "Normal",
  HIGH: "High",
  OVERLOADED: "Overloaded",
};

export function WorkloadBadge({ level, className }: { level: WorkloadLevel; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex w-fit shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        WORKLOAD_STYLES[level],
        className
      )}
    >
      {WORKLOAD_LABEL[level]}
    </span>
  );
}
