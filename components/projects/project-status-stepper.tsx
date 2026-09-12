import { Check, Pause } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProjectStatus } from "@/types/project";

const STAGES: ProjectStatus[] = ["Planning", "Active", "Completed"];

export function ProjectStatusStepper({ status }: { status: ProjectStatus }) {
  const onHold = status === "On Hold";
  const currentIndex = STAGES.indexOf(onHold ? "Active" : status);

  return (
    <div className="flex items-center">
      {STAGES.map((stage, index) => {
        const isPaused = onHold && index === currentIndex;
        const isComplete = index < currentIndex;
        const isCurrent = index === currentIndex && !isPaused;
        const isLast = index === STAGES.length - 1;

        return (
          <div key={stage} className={cn("flex items-center", !isLast && "flex-1")}>
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-medium ring-1",
                  isComplete && "bg-primary text-primary-foreground ring-primary",
                  isCurrent && "bg-primary/10 text-primary ring-primary",
                  isPaused && "bg-amber-100 text-amber-700 ring-amber-300 dark:bg-amber-500/15 dark:text-amber-300",
                  !isComplete && !isCurrent && !isPaused && "bg-muted text-muted-foreground ring-border"
                )}
              >
                {isComplete ? (
                  <Check className="size-4" />
                ) : isPaused ? (
                  <Pause className="size-3.5" />
                ) : (
                  index + 1
                )}
              </div>
              <span
                className={cn(
                  "text-xs font-medium",
                  isComplete || isCurrent || isPaused ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {isPaused ? "On Hold" : stage}
              </span>
            </div>
            {!isLast && (
              <div
                className={cn(
                  "mx-2 h-0.5 flex-1 rounded-full",
                  isComplete ? "bg-primary" : "bg-border"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
