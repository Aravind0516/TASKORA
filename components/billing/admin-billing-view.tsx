"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, Clock } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { PlanPricingCards } from "@/components/billing/plan-pricing-cards";
import { SubscriptionStatusBadge } from "@/components/shared/subscription-status-badge";
import { usePlatform } from "@/components/platform/platform-provider";
import { getEffectiveSubscriptionStatus } from "@/lib/access-control";
import { daysUntil, formatDate } from "@/lib/format";
import * as subscriptionRequestService from "@/lib/services/subscription-request.service";
import type { SubscriptionRequest, RequestablePlan } from "@/types/subscription-request";

export function AdminBillingView() {
  const { currentOrganizationId, getOrganization } = usePlatform();
  const org = getOrganization(currentOrganizationId);
  const [requests, setRequests] = useState<SubscriptionRequest[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!currentOrganizationId) return;
    const unsubscribe = subscriptionRequestService.subscribeToOrgSubscriptionRequests(
      currentOrganizationId,
      (data) => {
        setRequests(data);
        setLoaded(true);
      },
      () => setLoaded(true)
    );
    return unsubscribe;
  }, [currentOrganizationId]);

  if (!org || !loaded) {
    return (
      <div>
        <PageHeader title="Billing" description="Your organization's plan and access status" />
        <Skeleton className="h-40 w-full max-w-3xl rounded-xl" />
      </div>
    );
  }

  const effectiveStatus = getEffectiveSubscriptionStatus(org);
  const trialDaysLeft = Math.max(daysUntil(org.trialEndsAt), 0);
  const pendingRequest = requests.find((r) => r.status === "pending") ?? null;
  const pendingPlan: RequestablePlan | null = pendingRequest?.requestedPlan ?? null;
  const activePlan: RequestablePlan | null = org.subscriptionStatus === "ACTIVE" && org.plan !== "TRIAL" ? org.plan : null;
  const mostRecentReviewed = requests.find((r) => r.status !== "pending") ?? null;

  async function handleRequest(plan: RequestablePlan) {
    await subscriptionRequestService.requestPlan(plan);
  }

  return (
    <div>
      <PageHeader title="Billing" description="Your organization's plan and access status" />

      <Card className="mb-6 max-w-3xl">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-5">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-foreground">{org.plan} plan</p>
              <SubscriptionStatusBadge status={effectiveStatus} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {effectiveStatus === "ACTIVE" && `${org.plan === "PREMIUM" ? "Premium" : "Crazy"} plan active${org.subscriptionStartedAt ? ` since ${formatDate(org.subscriptionStartedAt)}` : ""}.`}
              {effectiveStatus === "TRIAL" && (trialDaysLeft > 0 ? `${trialDaysLeft}-day free trial — ${trialDaysLeft} day${trialDaysLeft === 1 ? "" : "s"} remaining.` : "Your free trial ends today.")}
              {effectiveStatus === "PENDING" && "Your plan request is under review."}
              {effectiveStatus === "EXPIRED" && "Your free trial has ended."}
              {effectiveStatus === "REJECTED" && "Your previous plan request was not approved."}
            </p>
          </div>
        </CardContent>
      </Card>

      {pendingRequest && (
        <div className="mb-6 flex max-w-3xl items-start gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3.5 text-sm text-amber-800 dark:text-amber-300">
          <Clock className="mt-0.5 size-4 shrink-0" />
          <p>
            Your request for the {pendingRequest.requestedPlan === "PREMIUM" ? "Premium" : "Crazy"} plan is under
            review. Request sent to NxtWise Platform Administration on {formatDate(pendingRequest.createdAt)}.
          </p>
        </div>
      )}

      {!pendingRequest && mostRecentReviewed?.status === "rejected" && (
        <div className="mb-6 flex max-w-3xl items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <XCircle className="mt-0.5 size-4 shrink-0" />
          <div>
            <p>Your previous {mostRecentReviewed.requestedPlan === "PREMIUM" ? "Premium" : "Crazy"} plan request wasn&apos;t approved.</p>
            {mostRecentReviewed.rejectionReason && <p className="mt-1 text-xs text-destructive/80">Reason: {mostRecentReviewed.rejectionReason}</p>}
          </div>
        </div>
      )}

      {effectiveStatus === "ACTIVE" && (
        <div className="mb-6 flex max-w-3xl items-start gap-2.5 rounded-lg bg-[#0ca30c]/10 px-4 py-3 text-sm text-[#0ca30c]">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          <p>{org.plan === "PREMIUM" ? "Premium" : "Crazy"} plan active.</p>
        </div>
      )}

      {(effectiveStatus === "EXPIRED" || effectiveStatus === "TRIAL" || effectiveStatus === "REJECTED") && !pendingRequest && (
        <>
          {effectiveStatus === "EXPIRED" && (
            <p className="mb-4 text-sm font-medium text-foreground">Choose a plan to continue using TASKORA.</p>
          )}
          <PlanPricingCards pendingPlan={pendingPlan} activePlan={activePlan} onRequest={handleRequest} />
        </>
      )}

      {effectiveStatus === "ACTIVE" && (
        <PlanPricingCards pendingPlan={null} activePlan={activePlan} onRequest={handleRequest} />
      )}
    </div>
  );
}
