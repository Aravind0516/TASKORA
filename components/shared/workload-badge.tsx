import { cn } from "@/lib/utils";
import type { WorkloadLevel } from "@/lib/workload";

const WORKLOAD_STYLES: Record<WorkloadLevel, string> = {
  LOW: "bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300",
  NORMAL: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  HIGH: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  OVERLOADED: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
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
