import type { PlatformRole } from "@/types/platform";

// Centralized "can this organization use TASKORA right now" logic — the
// single place every route guard/banner/UI gate reads from, per the
// subscription/access-control spec's explicit "do not scatter independent
// plan checks throughout the application." Consumed identically by the
// (app) shell's AccessGate, the admin console's AccessGate, and the trial
// banners in both — never re-implemented ad hoc at a call site.
//
// Deliberately NOT enforced in firestore.rules: this app has no existing
// precedent for gating ordinary reads/writes on organization-level state
// (a *suspended* organization's members can still read Firestore normally
// today — isMemberOfOrg() never checks org.status either), so a trial/
// subscription gate follows that same existing precedent — an application-
// level UX gate, not a data-access boundary. What IS enforced at the rules
// layer (see firestore.rules' organizations/subscriptionRequests blocks) is
// who can WRITE plan/subscriptionStatus/subscription request review
// decisions — that boundary is real and non-negotiable; this file is not it.

export const TRIAL_DURATION_DAYS = 15;

/** trialStartedAt + 15 days, as an ISO string — call once, at organization creation, from server code only (see lib/server/organizations.ts). */
export function computeTrialEndsAt(trialStartedAt: string): string {
  return new Date(new Date(trialStartedAt).getTime() + TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

/** subscriptionStartedAt + one billing month, as an ISO string — call once, at Super Admin approval time (see lib/server/subscriptions.ts). Record-keeping only for this phase (no automatic recurring billing/renewal exists yet), never used to auto-revoke an ACTIVE subscription — see hasPlatformAccess()'s own comment. */
export function computeSubscriptionEndsAt(subscriptionStartedAt: string): string {
  const start = new Date(subscriptionStartedAt);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);
  return end.toISOString();
}

export interface AccessRelevantOrg {
  subscriptionStatus: "TRIAL" | "PENDING" | "ACTIVE" | "REJECTED" | "EXPIRED";
  trialEndsAt: string;
  subscriptionEndsAt: string | null;
}

/**
 * Whether the given organization currently has access to protected TASKORA
 * functionality — deliberately computed from two objective, durable
 * timestamps (trialEndsAt, subscriptionEndsAt) and NEVER from the mutable
 * `subscriptionStatus` label. That label is request/display bookkeeping —
 * createSubscriptionRequest() flips it to "PENDING" every time a new request
 * is submitted, including for an organization that is already on an
 * approved, currently-valid paid plan (e.g. requesting an upgrade). If
 * access read that label, a still-valid paying organization's access could
 * flip off the moment they submitted another request, and stay off if that
 * request was later rejected — exactly the bug this function must not have.
 * By reading trialEndsAt/subscriptionEndsAt directly instead, a pending or
 * rejected REQUEST can never affect access one way or the other; only an
 * actual open trial window or an actual live approved access period can.
 *
 *   trial window still open           -> access, regardless of any request state
 *   organization has ever been approved for a plan (subscriptionEndsAt is
 *   set)                              -> access, unconditionally — no
 *                                        auto-expiry, matching this phase's
 *                                        explicit "no automatic recurring
 *                                        billing" scope; a LATER request
 *                                        (pending or rejected) never revokes
 *                                        an already-granted approval, because
 *                                        neither create nor reject ever clears
 *                                        subscriptionEndsAt once an approval
 *                                        has set it
 *   neither of the above                                      -> no access
 *
 * Super Admin always has access — it isn't scoped to any one organization
 * (organizationId is always null for that role) and platform administration
 * must never be blocked by any single org's billing state.
 */
export function hasPlatformAccess(organization: AccessRelevantOrg | null, role: PlatformRole | null): boolean {
  if (role === "super_admin") return true;
  if (!organization) return false;
  const trialActive = new Date(organization.trialEndsAt).getTime() > Date.now();
  if (trialActive) return true;
  return organization.subscriptionEndsAt !== null;
}

/**
 * Display-only derived status — distinct from the organization's STORED
 * subscriptionStatus (which is only ever updated by a real action: creation,
 * a request going pending, an approval, a rejection — never by a background
 * job, since this app has no Cloud Functions/cron to run one). This is what
 * "EXPIRED" actually means in the UI: no stored value ever literally becomes
 * "EXPIRED" in Firestore: this function computes it at read time by noticing
 * the trial window has closed with nothing else covering access.
 */
export function getEffectiveSubscriptionStatus(organization: AccessRelevantOrg): "TRIAL" | "PENDING" | "ACTIVE" | "REJECTED" | "EXPIRED" {
  if (organization.subscriptionStatus === "ACTIVE") return "ACTIVE";
  const trialActive = new Date(organization.trialEndsAt).getTime() > Date.now();
  if (trialActive) return organization.subscriptionStatus === "PENDING" ? "PENDING" : "TRIAL";
  if (organization.subscriptionStatus === "PENDING") return "PENDING";
  return "EXPIRED";
}
