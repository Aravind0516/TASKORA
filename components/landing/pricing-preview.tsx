"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { SectionHeading } from "@/components/landing/shared/section-heading";
import { Reveal } from "@/components/landing/shared/reveal";
import { GlassCard } from "@/components/landing/shared/glass-card";
import { cn } from "@/lib/utils";

const PLANS = [
  {
    name: "Free",
    price: "₹0",
    period: "15-day trial",
    description: "For individuals getting organized.",
    features: ["Up to 3 projects", "Unlimited tasks", "Kanban board", "Basic analytics"],
    recommended: false,
  },
  {
    name: "Premium",
    price: "₹699",
    period: "per month",
    description: "For teams that need to move fast.",
    features: ["Unlimited projects", "Advanced analytics", "Team roles & permissions", "Priority support"],
    recommended: true,
  },
  {
    name: "Crazy",
    price: "₹1,499",
    period: "per month",
    description: "For organizations with complex workflows.",
    features: ["Everything in Premium", "SSO & advanced security", "Dedicated onboarding", "Custom integrations"],
    recommended: false,
  },
];

export function PricingPreview() {
  return (
    <section id="pricing" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Pricing"
          title="Simple pricing that scales with your team."
          description="Start on a 15-day free trial. Premium and Crazy plans are activated after a quick NxtWise Platform Administration review."
        />

        <div className="mt-16 grid grid-cols-1 gap-5 lg:grid-cols-3">
          {PLANS.map((plan, i) => (
            <Reveal key={plan.name} delay={i * 110}>
              <GlassCard
                className={cn(
                  "flex h-full flex-col p-6 sm:p-7",
                  plan.recommended && "border-primary/40 bg-primary/[0.06] shadow-[0_0_50px_-15px_var(--landing-glow)]"
                )}
              >
                {plan.recommended && (
                  <span className="mb-4 inline-flex w-fit items-center rounded-full bg-primary px-2.5 py-1 text-[11px] font-medium text-primary-foreground">
                    Recommended
                  </span>
                )}
                <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
                <div className="mt-5 flex items-baseline gap-1.5">
                  <span className="text-3xl font-semibold tracking-tight text-foreground">{plan.price}</span>
                  <span className="text-xs text-muted-foreground">{plan.period}</span>
                </div>

                <ul className="mt-6 flex-1 space-y-2.5">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-foreground/80">
                      <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <Link
                  href="/register"
                  className={cn(
                    "mt-7 inline-flex items-center justify-center rounded-full px-4 py-2.5 text-sm font-medium transition-colors",
                    plan.recommended
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "border border-white/15 text-foreground hover:bg-white/5"
                  )}
                >
                  Start with TASKORA
                </Link>
              </GlassCard>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
