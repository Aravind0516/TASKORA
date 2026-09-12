import { SectionHeading } from "@/components/landing/shared/section-heading";
import { Reveal } from "@/components/landing/shared/reveal";
import { GlassCard } from "@/components/landing/shared/glass-card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const QUOTES = [
  {
    quote:
      "We stopped asking 'where are we on this?' in every meeting. TASKORA just shows us — in real time, without anyone updating a spreadsheet.",
    name: "Jordan Ellis",
    role: "Head of Operations, Northpeak (illustrative)",
    initials: "JE",
  },
  {
    quote:
      "The Kanban flow finally matches how our team actually thinks. Moving a card feels instant, and the whole board reacts with it.",
    name: "Maya Torres",
    role: "Product Lead, Orbit & Co (illustrative)",
    initials: "MT",
  },
  {
    quote:
      "Analytics that don't require a data team to interpret. We see velocity trending up and know exactly why.",
    name: "Sam Okafor",
    role: "Engineering Manager, Strata (illustrative)",
    initials: "SO",
  },
];

export function Testimonials() {
  return (
    <section id="testimonials" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="What teams say"
          title="Designed around how work actually happens."
          description="Illustrative example feedback — representative of the experience TASKORA is built to deliver."
        />

        <div className="mt-16 grid grid-cols-1 gap-5 lg:grid-cols-3">
          {QUOTES.map((item, i) => (
            <Reveal key={item.name} delay={i * 120}>
              <GlassCard className="flex h-full flex-col p-6">
                <p className="text-balance text-[15px] leading-relaxed text-foreground/85">&ldquo;{item.quote}&rdquo;</p>
                <div className="mt-6 flex items-center gap-3 border-t border-white/10 pt-5">
                  <Avatar size="sm">
                    <AvatarFallback className="bg-primary/15 text-primary">{item.initials}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{item.role}</p>
                  </div>
                </div>
              </GlassCard>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
