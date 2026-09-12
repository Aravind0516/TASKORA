import type { ReactNode } from "react";
import { SectionHeading } from "@/components/landing/shared/section-heading";
import { Reveal } from "@/components/landing/shared/reveal";
import { DashboardScene } from "@/components/landing/product-mock/dashboard-scene";
import { ProjectScene } from "@/components/landing/product-mock/project-scene";
import { KanbanScene } from "@/components/landing/product-mock/kanban-scene";
import { TeamScene } from "@/components/landing/product-mock/team-scene";
import { AnalyticsScene } from "@/components/landing/product-mock/analytics-scene";
import { cn } from "@/lib/utils";

interface FeatureRowProps {
  index: string;
  title: string;
  description: string;
  scene: ReactNode;
  reversed?: boolean;
}

function FeatureRow({ index, title, description, scene, reversed }: FeatureRowProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16",
        reversed && "lg:[&>*:first-child]:order-2"
      )}
    >
      <Reveal>
        <span className="font-mono text-xs tracking-widest text-primary/70">{index}</span>
        <h3 className="mt-3 text-balance text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {title}
        </h3>
        <p className="mt-4 max-w-md text-balance leading-relaxed text-muted-foreground">{description}</p>
      </Reveal>
      <Reveal delay={120}>{scene}</Reveal>
    </div>
  );
}

export function FeatureShowcase() {
  return (
    <section id="features" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Inside TASKORA"
          title="Five ways TASKORA keeps work moving."
          description="Not another basic task list — a connected system that shows you exactly where momentum is building and where it's stalling."
        />

        <div className="mt-20 space-y-28 sm:space-y-36">
          <FeatureRow
            index="01 — Command Center"
            title="See everything, miss nothing."
            description="A live overview of every project, task, and teammate — metrics update, activity streams in, and nothing falls through the cracks."
            scene={<DashboardScene />}
          />
          <FeatureRow
            index="02 — Project Control"
            title="Projects that manage themselves."
            description="Timelines, stages, and progress stay in sync automatically as work happens — no status meeting required to know where things stand."
            scene={<ProjectScene />}
            reversed
          />
          <FeatureRow
            index="03 — Flow State"
            title="Work moves, visibly."
            description="A Kanban board built for momentum. Drag a card, change a status, and watch the whole team's picture update instantly."
            scene={<KanbanScene />}
          />
          <FeatureRow
            index="04 — Team Sync"
            title="Everyone, aligned in real time."
            description="Assignments, availability, and activity — always current, so handoffs happen without a single 'can you check on this?' message."
            scene={<TeamScene />}
            reversed
          />
          <FeatureRow
            index="05 — Intelligence"
            title="Insight, not just data."
            description="Completion trends, velocity, and workload surface automatically — so decisions are backed by signal, not guesswork."
            scene={<AnalyticsScene />}
          />
        </div>
      </div>
    </section>
  );
}
