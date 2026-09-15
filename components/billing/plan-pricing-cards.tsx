"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { AlertCircle } from "lucide-react";
import { PLAN_PRICING, type RequestablePlan } from "@/types/subscription-request";
import { cn } from "@/lib/utils";

const PLAN_FEATURES: Record<RequestablePlan, string[]> = {
  PREMIUM: ["Unlimited projects", "Advanced analytics", "Team roles & permissions", "Priority support"],
  CRAZY: ["Everything in Premium", "SSO & advanced security", "Dedicated onboarding", "Custom integrations"],
};

interface PlanPricingCardsProps {
  /** Which plan (if any) currently has a request under review — disables that plan's button and shows "Under review" instead. */
  pendingPlan?: RequestablePlan | null;
  /** Which plan (if any) is the organization's current active plan — shown as "Current plan" instead of a request button. */
  activePlan?: RequestablePlan | null;
  onRequest: (plan: RequestablePlan) => Promise<void>;
}

/**
 * Premium pricing presentation for the real in-app request flow (distinct
 * from the public landing page's illustrative marketing cards). No payment
 * form anywhere — clicking a plan opens a confirmation dialog, then creates a
 * subscriptionRequests/{id} for NxtWise Platform Administration to review.
 */
export function PlanPricingCards({ pendingPlan, activePlan, onRequest }: PlanPricingCardsProps) {
  const [confirmPlan, setConfirmPlan] = useState<RequestablePlan | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentPlan, setSentPlan] = useState<RequestablePlan | null>(null);

  async function handleConfirm() {
    if (!confirmPlan) return;
    setSubmitting(true);
    setError(null);
    try {
      await onRequest(confirmPlan);
      setSentPlan(confirmPlan);
      setConfirmPlan(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send your request.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {(Object.keys(PLAN_PRICING) as RequestablePlan[]).map((plan) => {
          const info = PLAN_PRICING[plan];
          const isActive = activePlan === plan;
          const isPending = pendingPlan === plan;
          const recommended = plan === "PREMIUM";
          return (
            <Card key={plan} className={cn("flex flex-col", recommended && !isActive && "border-primary/40")}>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle>{info.label}</CardTitle>
                  {recommended && !isActive && (
                    <span className="inline-flex w-fit items-center rounded-full bg-primary px-2.5 py-1 text-[11px] font-medium text-primary-foreground">
                      Recommended
                    </span>
                  )}
                </div>
                <CardDescription>
                  <span className="text-2xl font-semibold tracking-tight text-foreground">₹{info.priceInInr}</span>{" "}
                  <span className="text-xs">{info.period}</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <ul className="space-y-2">
                  {PLAN_FEATURES[plan].map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-foreground/80">
                      <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                {isActive ? (
                  <Button className="w-full" disabled variant="secondary">
                    Current plan
                  </Button>
                ) : isPending || sentPlan === plan ? (
                  <Button className="w-full" disabled variant="outline">
                    Under review
                  </Button>
                ) : (
                  <Button className="w-full" onClick={() => setConfirmPlan(plan)}>
                    Request {info.label}
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>

      <Dialog open={confirmPlan !== null} onOpenChange={(open) => !open && setConfirmPlan(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Request {confirmPlan ? PLAN_PRICING[confirmPlan].label : ""}</DialogTitle>
            <DialogDescription>
              This sends a request to NxtWise Platform Administration for review — no payment is collected now. Your
              plan activates only once approved.
            </DialogDescription>
          </DialogHeader>
          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmPlan(null)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="button" onClick={handleConfirm} disabled={submitting}>
              {submitting ? "Sending..." : "Send request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
