"use client";

import { Check } from "lucide-react";
import { GlassCard } from "@/components/landing/shared/glass-card";
import { useReveal } from "@/lib/landing/use-reveal";
import { useCounter } from "@/lib/landing/use-counter";
import { cn } from "@/lib/utils";

const STAGES = ["Planning", "Active", "Review", "Complete"];

export function ProjectScene({ className }: { className?: string }) {
  const { ref, visible } = useReveal<HTMLDivElement>();
  const progress = useCounter(82, visible, 1400);

  return (
    <GlassCard ref={ref} className={cn("p-5 sm:p-6", className)}>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">Billing Platform Migration</p>
          <p className="text-xs text-muted-foreground">Due in 12 days</p>
        </div>
        <span className="rounded-full bg-primary/15 px-2.5 py-1 text-xs font-medium text-primary">{progress}%</span>
      </div>

      <div className="mb-6 h-2 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary to-violet-400 transition-[width] duration-[1400ms] ease-out"
          style={{ width: visible ? "82%" : "0%" }}
        />
      </div>

      <div className="flex items-center">
        {STAGES.map((stage, i) => {
          const done = i < 3;
          const isLast = i === STAGES.length - 1;
          return (
            <div key={stage} className={cn("flex items-center", !isLast && "flex-1")}>
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={cn(
                    "flex size-7 items-center justify-center rounded-full text-xs font-medium ring-1 transition-colors duration-500",
                    done
                      ? "bg-primary text-primary-foreground ring-primary"
                      : "bg-white/5 text-muted-foreground ring-white/15"
                  )}
                  style={{ transitionDelay: `${i * 200}ms` }}
                >
                  {done ? <Check className="size-3.5" /> : i + 1}
                </div>
                <span className="text-[10px] text-muted-foreground">{stage}</span>
              </div>
              {!isLast && (
                <div
                  className={cn(
                    "mx-2 h-0.5 flex-1 rounded-full transition-colors duration-500",
                    done ? "bg-primary" : "bg-white/10"
                  )}
                  style={{ transitionDelay: `${i * 200}ms` }}
                />
              )}
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}
