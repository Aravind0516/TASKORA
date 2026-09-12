"use client";

import type { CSSProperties } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { AmbientBackground } from "@/components/landing/shared/ambient-background";
import { MagneticButton } from "@/components/landing/shared/magnetic-button";
import { Eyebrow } from "@/components/landing/shared/section-heading";
import { DashboardScene } from "@/components/landing/product-mock/dashboard-scene";
import { useAuthDialog } from "@/components/landing/shared/auth-dialog-provider";
import { usePointerParallax } from "@/lib/landing/use-pointer-parallax";

export function Hero() {
  const { ref, x, y } = usePointerParallax<HTMLDivElement>();
  const { openAuth } = useAuthDialog();

  const layerFar: CSSProperties = { transform: `translate3d(${x * 6}px, ${y * 6}px, 0)` };
  const layerNear: CSSProperties = { transform: `translate3d(${x * 14}px, ${y * 14}px, 0)` };

  return (
    <section id="hero" ref={ref} className="relative overflow-hidden pt-36 pb-20 sm:pt-44 sm:pb-28">
      <AmbientBackground className="opacity-90" />

      <div className="relative z-10 mx-auto flex max-w-6xl flex-col items-center px-4 text-center sm:px-6">
        <div className="landing-reveal is-visible">
          <Eyebrow>
            <Sparkles className="size-3.5 text-primary" />
            The modern work OS
          </Eyebrow>
        </div>

        <h1
          className="mt-7 max-w-4xl text-balance font-heading text-[2.6rem] leading-[1.05] font-semibold tracking-tight text-foreground sm:text-6xl lg:text-7xl"
          style={{ animation: "landing-rise-in 1s cubic-bezier(0.16,1,0.3,1) 0.1s both" }}
        >
          Turn every task into{" "}
          <span className="bg-gradient-to-r from-primary via-violet-300 to-primary bg-clip-text text-transparent">
            momentum.
          </span>
        </h1>

        <p className="mt-6 max-w-xl text-balance text-base leading-relaxed text-muted-foreground sm:text-lg">
          TASKORA unifies projects, tasks, and teams into one intelligent workspace — so work moves forward instead
          of piling up.
        </p>

        <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row">
          <MagneticButton onClick={() => openAuth("register")}>
            Start Building
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </MagneticButton>
          <MagneticButton href="#features" variant="ghost">
            Explore TASKORA
          </MagneticButton>
        </div>

        <div className="relative mt-16 w-full max-w-5xl sm:mt-20" style={{ perspective: "1400px" }}>
          <div
            aria-hidden
            className="absolute -inset-x-10 -inset-y-6 -z-10 rounded-[2.5rem] bg-primary/10 blur-3xl"
            style={layerFar}
          />
          <div style={layerNear} className="transition-transform duration-300 ease-out">
            <DashboardScene className="shadow-[0_60px_120px_-40px_rgba(0,0,0,0.7)]" />
          </div>
        </div>
      </div>
    </section>
  );
}
