import { ArrowDown, ArrowRight } from "lucide-react";
import { SectionHeading } from "@/components/landing/shared/section-heading";
import { Reveal } from "@/components/landing/shared/reveal";
import { cn } from "@/lib/utils";

const STAGES = ["Scattered work", "Projects", "Tasks", "Teams", "Insights", "Momentum"];

export function ProductStory() {
  return (
    <section id="story" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="The problem"
          title="Work shouldn't feel fragmented."
          description="Scattered docs, drifting priorities, and status meetings that exist only to ask 'where are we?' TASKORA turns the mess into a single, connected flow."
        />

        <div className="mt-16 flex flex-col items-center gap-3 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-3">
          {STAGES.map((stage, i) => {
            const isLast = i === STAGES.length - 1;
            return (
              <div key={stage} className="flex flex-col items-center gap-3 sm:flex-row">
                <Reveal delay={i * 110}>
                  <div
                    className={cn(
                      "rounded-xl border px-5 py-3.5 text-center transition-colors",
                      isLast
                        ? "border-primary/40 bg-primary/15 shadow-[0_0_30px_-8px_var(--landing-glow)]"
                        : "border-white/10 bg-white/[0.03]"
                    )}
                  >
                    <p className={cn("text-sm font-medium", isLast ? "text-primary" : "text-foreground/85")}>
                      {stage}
                    </p>
                  </div>
                </Reveal>
                {!isLast && (
                  <span className="text-muted-foreground/40" aria-hidden>
                    <ArrowDown className="size-4 sm:hidden" />
                    <ArrowRight className="hidden size-4 sm:block" />
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
