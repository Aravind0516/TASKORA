"use client";

import { AmbientBackground } from "@/components/landing/shared/ambient-background";
import { useScrollProgress } from "@/lib/landing/use-scroll-progress";
import { cn } from "@/lib/utils";

const STAGES = [
  { label: "Capture", copy: "Every idea, request, and to-do — captured the instant it happens." },
  { label: "Organize", copy: "Automatically sorted into the right project, with the right priority." },
  { label: "Execute", copy: "Move work forward on a board built for flow, not friction." },
  { label: "Collaborate", copy: "Teams stay in sync without a single status-update meeting." },
  { label: "Measure", copy: "Velocity, completion, and workload — visible at a glance." },
  { label: "Accelerate", copy: "Momentum compounds. Every sprint outpaces the last." },
];

export function ScrollStory() {
  const { ref, progress } = useScrollProgress<HTMLElement>();
  const stageCount = STAGES.length;
  const activeIndex = Math.min(stageCount - 1, Math.floor(progress * stageCount));

  return (
    <section id="workflow" ref={ref} className="relative" style={{ height: `${stageCount * 100}vh` }}>
      <div className="sticky top-0 flex h-dvh items-center overflow-hidden">
        <AmbientBackground className="opacity-70" />
        <div className="relative z-10 mx-auto w-full max-w-5xl px-4 sm:px-6">
          <div className="mb-10 flex items-center justify-center gap-2" aria-hidden>
            {STAGES.map((stage, i) => (
              <div
                key={stage.label}
                className={cn(
                  "h-1 rounded-full transition-all duration-500",
                  i === activeIndex ? "w-10 bg-primary" : "w-4 bg-white/15"
                )}
              />
            ))}
          </div>

          <div className="relative h-64 sm:h-48">
            {STAGES.map((stage, i) => (
              <div
                key={stage.label}
                aria-hidden={i !== activeIndex}
                className={cn(
                  "absolute inset-0 flex flex-col items-center justify-center px-4 text-center transition-all duration-700 ease-out",
                  i === activeIndex
                    ? "translate-y-0 opacity-100"
                    : i < activeIndex
                      ? "-translate-y-6 opacity-0"
                      : "translate-y-6 opacity-0"
                )}
              >
                <span className="font-mono text-xs tracking-widest text-primary/70">
                  STAGE {String(i + 1).padStart(2, "0")}
                </span>
                <h2 className="mt-4 text-4xl font-semibold tracking-tight text-foreground sm:text-6xl">
                  {stage.label}
                </h2>
                <p className="mt-4 max-w-md text-balance text-muted-foreground">{stage.copy}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
