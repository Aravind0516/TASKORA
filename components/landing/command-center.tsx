import { SectionHeading } from "@/components/landing/shared/section-heading";
import { Reveal } from "@/components/landing/shared/reveal";
import { AmbientBackground } from "@/components/landing/shared/ambient-background";
import { DashboardScene } from "@/components/landing/product-mock/dashboard-scene";

export function CommandCenter() {
  return (
    <section id="command-center" className="relative overflow-hidden py-24 sm:py-32">
      <AmbientBackground className="opacity-60" />
      <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Command Center"
          title="One place for everything that moves work forward."
          description="Tasks, projects, deadlines, and team activity — layered into a single living view of your workspace."
        />

        <Reveal className="mt-16" delay={100}>
          <DashboardScene className="shadow-[0_80px_140px_-50px_rgba(0,0,0,0.75)]" />
        </Reveal>
      </div>
    </section>
  );
}
