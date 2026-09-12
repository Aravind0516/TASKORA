"use client";

import type { CSSProperties } from "react";
import { GlassCard } from "@/components/landing/shared/glass-card";
import { useReveal } from "@/lib/landing/use-reveal";
import { useCounter } from "@/lib/landing/use-counter";
import { cn } from "@/lib/utils";

const POINTS = [8, 14, 11, 20, 18, 27, 24, 34];

function buildPath(values: number[], width: number, height: number) {
  const max = Math.max(...values);
  const step = width / (values.length - 1);
  return values
    .map((v, i) => `${i === 0 ? "M" : "L"} ${(i * step).toFixed(1)} ${(height - (v / max) * height).toFixed(1)}`)
    .join(" ");
}

export function AnalyticsScene({ className }: { className?: string }) {
  const { ref, visible } = useReveal<HTMLDivElement>();
  const completed = useCounter(342, visible, 1400);
  const velocity = useCounter(94, visible, 1400);
  const path = buildPath(POINTS, 280, 90);
  const dashStyle = { "--dash": 420 } as CSSProperties;

  return (
    <GlassCard ref={ref} className={cn("p-5 sm:p-6", visible && "is-visible", className)}>
      <div className="mb-4 flex items-center gap-6">
        <div>
          <p className="text-[11px] text-muted-foreground">Tasks completed</p>
          <p className="text-2xl font-semibold tabular-nums text-foreground">{completed}</p>
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground">Team velocity</p>
          <p className="text-2xl font-semibold tabular-nums text-foreground">{velocity}%</p>
        </div>
      </div>
      <svg viewBox="0 0 280 90" className="w-full" role="img" aria-label="Weekly completion trend">
        <path
          d={path}
          fill="none"
          stroke="url(#analytics-gradient)"
          strokeWidth="2.5"
          strokeLinecap="round"
          className="landing-draw-path"
          style={dashStyle}
        />
        <defs>
          <linearGradient id="analytics-gradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="oklch(0.7 0.16 264)" />
            <stop offset="100%" stopColor="oklch(0.75 0.14 300)" />
          </linearGradient>
        </defs>
      </svg>
    </GlassCard>
  );
}
