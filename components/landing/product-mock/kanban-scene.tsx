"use client";

import { useEffect, useState } from "react";
import { GlassCard } from "@/components/landing/shared/glass-card";
import { useReveal } from "@/lib/landing/use-reveal";
import { PriorityBadge } from "@/components/shared/priority-badge";
import { cn } from "@/lib/utils";
import type { TaskPriority } from "@/types/task";

const COLUMNS = ["Backlog", "In Progress", "Done"] as const;

const BASE_CARDS: Record<(typeof COLUMNS)[number], { title: string; priority: TaskPriority }[]> = {
  Backlog: [{ title: "Design onboarding flow", priority: "Medium" }],
  "In Progress": [{ title: "API rate limiting", priority: "High" }],
  Done: [{ title: "Ship pricing page", priority: "Low" }],
};

const MOVING_CARD = { title: "Audit logging for auth events", priority: "Critical" as TaskPriority };

export function KanbanScene({ className }: { className?: string }) {
  const { ref, visible } = useReveal<HTMLDivElement>();
  const [moved, setMoved] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const timeout = setTimeout(() => setMoved(true), 1300);
    return () => clearTimeout(timeout);
  }, [visible]);

  return (
    <GlassCard ref={ref} className={cn("p-4 sm:p-5", className)}>
      <div className="grid grid-cols-3 gap-3">
        {COLUMNS.map((column) => {
          const showMovingHere = (column === "Backlog" && !moved) || (column === "In Progress" && moved);
          return (
            <div key={column} className="rounded-lg bg-white/[0.03] p-2.5">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] font-medium text-muted-foreground">{column}</span>
                <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  {BASE_CARDS[column].length + (showMovingHere ? 1 : 0)}
                </span>
              </div>
              <div className="space-y-2">
                {showMovingHere && (
                  <div
                    className={cn(
                      "rounded-md border border-primary/30 bg-primary/10 p-2 shadow-[0_0_20px_-4px_var(--landing-glow)] transition-all duration-700 ease-out",
                      visible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
                    )}
                  >
                    <p className="text-[11px] font-medium text-foreground">{MOVING_CARD.title}</p>
                    <PriorityBadge priority={MOVING_CARD.priority} className="mt-1.5" />
                  </div>
                )}
                {BASE_CARDS[column].map((card) => (
                  <div key={card.title} className="rounded-md border border-white/10 bg-white/[0.03] p-2">
                    <p className="text-[11px] font-medium text-foreground/90">{card.title}</p>
                    <PriorityBadge priority={card.priority} className="mt-1.5" />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}
