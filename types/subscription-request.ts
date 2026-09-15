// A single organization's request to move onto a paid plan — reviewed
// manually by a Super Admin (no payment gateway integration yet; see
// lib/server/subscriptions.ts). One dedicated top-level collection
// (`subscriptionRequests`), matching this app's existing flat,
// organizationId-scoped collection pattern (projects/tasks/teams/...)
// rather than nesting under the organization document.

/** The two paid tiers an organization can request. "TRIAL" is never requested — it's the default state every organization starts in. */
export type RequestablePlan = "PREMIUM" | "CRAZY";

export type SubscriptionRequestStatus = "pending" | "approved" | "rejected";

export interface SubscriptionRequest {
  id: string;
  organizationId: string;
  /** Denormalized at creation time — lets the Super Admin's request table render without an N+1 organization lookup per row. Never trusted for authorization; every rule/route re-derives organizationId's real owner from the live organization doc. */
  organizationName: string;
  /** uid of the ORG_ADMIN who submitted the request. */
  requestedBy: string;
  requestedByEmail: string;
  requestedByName: string;
  requestedPlan: RequestablePlan;
  status: SubscriptionRequestStatus;
  createdAt: string;
  reviewedAt: string | null;
  /** uid of the Super Admin who approved/rejected — null until reviewed. */
  reviewedBy: string | null;
  /** Only ever set when status is "rejected"; null otherwise. */
  rejectionReason: string | null;
}

/**
 * Illustrative, manually-set INR prices (no payment gateway; see
 * lib/server/subscriptions.ts's header comment) — the only two plans an
 * organization can actually request. "Free"/"Trial" isn't a requestable
 * plan, so it isn't listed here.
 */
export const PLAN_PRICING: Record<RequestablePlan, { label: string; priceInInr: number; period: string }> = {
  PREMIUM: { label: "Premium", priceInInr: 699, period: "per month" },
  CRAZY: { label: "Crazy", priceInInr: 1499, period: "per month" },
};
