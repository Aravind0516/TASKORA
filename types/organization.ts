// This is the REAL Firestore-facing shape (lowercase status, per the backend
// data contract). components/platform/* keeps its own display-facing
// `Organization` type in types/platform.ts (Title Case status, matching the
// shared StatusBadge/PersonStatusBadge components already built) — the two
// are bridged in components/platform/platform-provider.tsx, not aliased,
// so no view component needed to change when this backend phase landed.
export type OrganizationStatus = "active" | "suspended";

// Manual-approval subscription model (no payment gateway yet). Every
// organization starts on "TRIAL" the moment it's created; a paid plan only
// ever becomes "PREMIUM"/"CRAZY" once a Super Admin approves a
// subscriptionRequests/{id} document (see lib/server/subscriptions.ts) —
// never by a client writing this field directly (firestore.rules' admin
// branch never includes "plan" in its onlyChangingFields allow-list).
export type OrganizationPlan = "TRIAL" | "PREMIUM" | "CRAZY";

// The organization's current subscription lifecycle state. This is the LAST
// ACTION taken (trial started, a request went pending, an approval/
// rejection happened) — it is deliberately NOT auto-flipped to "EXPIRED" by
// any background job (this app has no Cloud Functions/cron). Whether access
// should actually be restricted right now is always computed at read time by
// lib/access-control.ts's hasPlatformAccess()/getEffectiveSubscriptionStatus(),
// comparing trialEndsAt/subscriptionEndsAt against the current time — never
// stored as a ticking countdown that something else has to keep correct.
export type SubscriptionStatus = "TRIAL" | "PENDING" | "ACTIVE" | "REJECTED" | "EXPIRED";

export interface OrganizationDoc {
  id: string;
  name: string;
  slug: string;
  description: string;
  industry?: string;
  contactEmail?: string;
  plan: OrganizationPlan;
  subscriptionStatus: SubscriptionStatus;
  /** Server-set at creation (lib/server/organizations.ts) — never client-supplied. */
  trialStartedAt: string;
  /** trialStartedAt + 15 days, computed server-side at creation time. */
  trialEndsAt: string;
  /** Set only when a Super Admin approves a subscriptionRequests/{id}. null until then. */
  subscriptionStartedAt: string | null;
  /** subscriptionStartedAt + one billing month, set alongside it on approval. null until then. */
  subscriptionEndsAt: string | null;
  ownerId: string;
  adminIds: string[];
  memberIds: string[];
  status: OrganizationStatus;
  createdAt: string;
  updatedAt: string;
}
