"use client";

import { ArrowRight } from "lucide-react";
import { AmbientBackground } from "@/components/landing/shared/ambient-background";
import { MagneticButton } from "@/components/landing/shared/magnetic-button";
import { GlassCard } from "@/components/landing/shared/glass-card";
import { Reveal } from "@/components/landing/shared/reveal";
import { StatusBadge } from "@/components/shared/status-badge";
import { PriorityBadge } from "@/components/shared/priority-badge";
import { useAuthDialog } from "@/components/landing/shared/auth-dialog-provider";

export function FinalCTA() {
  const { openAuth } = useAuthDialog();

  return (
    <section className="relative overflow-hidden py-28 sm:py-36">
      <AmbientBackground className="opacity-80" />

      <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center px-4 text-center sm:px-6">
        <div aria-hidden className="pointer-events-none absolute inset-0 hidden lg:block">
          <GlassCard className="absolute top-6 left-0 w-44 -rotate-6 p-3 opacity-70">
            <StatusBadge status="Active" />
            <p className="mt-2 text-xs font-medium text-foreground/80">Launch readiness</p>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-4/5 rounded-full bg-primary" />
            </div>
          </GlassCard>
          <GlassCard className="absolute top-16 right-0 w-44 rotate-6 p-3 opacity-70">
            <PriorityBadge priority="High" />
            <p className="mt-2 text-xs font-medium text-foreground/80">Ship pricing page</p>
          </GlassCard>
        </div>

        <Reveal>
          <h2 className="text-balance font-heading text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Your team&apos;s next level starts here.
          </h2>
          <p className="mx-auto mt-5 max-w-md text-balance text-base text-muted-foreground sm:text-lg">
            Plan less. Execute better. Move faster.
          </p>
          <div className="mt-9">
            <MagneticButton onClick={() => openAuth("register")}>
              Start Building with TASKORA
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </MagneticButton>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
