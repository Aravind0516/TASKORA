import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { ApiError } from "@/lib/server/api-response";
import { notifySuperAdmins, notifyOrgAdmins } from "@/lib/server/notifications";
import { computeSubscriptionEndsAt } from "@/lib/access-control";
import type { RequestablePlan, SubscriptionRequest } from "@/types/subscription-request";

// Manual Super Admin approval model for TASKORA's first subscription system.
// No payment gateway (Razorpay/Stripe/PayPal/UPI) is integrated — that is an
// explicit future phase. Every write here happens via the Admin SDK from a
// Route Handler (app/api/subscription-requests/*), never a direct client
// Firestore write — firestore.rules' subscriptionRequests block is
// `allow write: if false` for exactly this reason, mirroring the existing
// `invitations` collection's pattern: the ONLY way plan/subscriptionStatus
// ever changes is through this file, under a verified Super Admin's request.

const VALID_REQUESTABLE_PLANS: RequestablePlan[] = ["PREMIUM", "CRAZY"];

function requestFromDoc(doc: FirebaseFirestore.DocumentSnapshot): SubscriptionRequest {
  const data = doc.data()!;
  return {
    id: doc.id,
    organizationId: data.organizationId,
    organizationName: data.organizationName,
    requestedBy: data.requestedBy,
    requestedByEmail: data.requestedByEmail,
    requestedByName: data.requestedByName,
    requestedPlan: data.requestedPlan,
    status: data.status,
    createdAt: data.createdAt?.toDate?.().toISOString() ?? new Date().toISOString(),
    reviewedAt: data.reviewedAt?.toDate?.().toISOString() ?? null,
    reviewedBy: data.reviewedBy ?? null,
    rejectionReason: data.rejectionReason ?? null,
  };
}

export interface CreateSubscriptionRequestInput {
  organizationId: string;
  requestedBy: string;
  requestedByEmail: string;
  requestedByName: string;
  requestedPlan: string;
}

/**
 * An ORG_ADMIN requests a paid plan for their own organization. Caller
 * (app/api/subscription-requests/route.ts) has already verified the caller
 * is role "admin" and that organizationId is THEIR OWN org from verified
 * claims — this function re-verifies the organization actually exists (never
 * trust an id alone) and refuses a second pending request for the same org
 * rather than letting duplicates pile up.
 */
export async function createSubscriptionRequest(input: CreateSubscriptionRequestInput): Promise<SubscriptionRequest> {
  if (!VALID_REQUESTABLE_PLANS.includes(input.requestedPlan as RequestablePlan)) {
    throw new ApiError(400, "Invalid plan requested.");
  }
  const db = getAdminDb();
  const orgRef = db.collection("organizations").doc(input.organizationId);
  const orgSnap = await orgRef.get();
  if (!orgSnap.exists) throw new ApiError(404, "Organization not found.");
  const org = orgSnap.data()!;

  const existingPending = await db
    .collection("subscriptionRequests")
    .where("organizationId", "==", input.organizationId)
    .where("status", "==", "pending")
    .limit(1)
    .get();
  if (!existingPending.empty) {
    throw new ApiError(409, "A plan request for your organization is already under review.");
  }

  const ref = db.collection("subscriptionRequests").doc();
  await ref.set({
    organizationId: input.organizationId,
    organizationName: org.name,
    requestedBy: input.requestedBy,
    requestedByEmail: input.requestedByEmail,
    requestedByName: input.requestedByName,
    requestedPlan: input.requestedPlan,
    status: "pending",
    createdAt: FieldValue.serverTimestamp(),
    reviewedAt: null,
    reviewedBy: null,
    rejectionReason: null,
  });

  // Trial/access state is untouched here — a pending request never grants
  // access on its own; see lib/access-control.ts's hasPlatformAccess() for
  // why "still within the trial window" is what actually keeps a PENDING
  // organization usable, not the request itself. We do mark subscriptionStatus
  // "PENDING" purely as a record of "a request exists," matching the spec's
  // documented status vocabulary.
  await orgRef.update({ subscriptionStatus: "PENDING", updatedAt: new Date().toISOString() });

  await notifySuperAdmins({
    organizationId: input.organizationId,
    actorId: input.requestedBy,
    type: "subscription_requested",
    title: "New plan request",
    message: `${org.name} requested the ${input.requestedPlan === "PREMIUM" ? "Premium" : "Crazy"} plan.`,
    href: "/superadmin/subscriptions",
  });

  const snap = await ref.get();
  return requestFromDoc(snap);
}

export interface ReviewSubscriptionRequestInput {
  requestId: string;
  reviewerId: string;
}

/** Approves a pending request: activates the organization's paid plan and records the access period. */
export async function approveSubscriptionRequest(input: ReviewSubscriptionRequestInput): Promise<SubscriptionRequest> {
  const db = getAdminDb();
  const requestRef = db.collection("subscriptionRequests").doc(input.requestId);
  const requestSnap = await requestRef.get();
  if (!requestSnap.exists) throw new ApiError(404, "Subscription request not found.");
  const request = requestSnap.data()!;
  if (request.status !== "pending") throw new ApiError(409, "This request has already been reviewed.");

  const orgRef = db.collection("organizations").doc(request.organizationId);
  const orgSnap = await orgRef.get();
  if (!orgSnap.exists) throw new ApiError(404, "The requesting organization no longer exists.");
  const org = orgSnap.data()!;

  const now = new Date().toISOString();
  const subscriptionEndsAt = computeSubscriptionEndsAt(now);

  await orgRef.update({
    plan: request.requestedPlan,
    subscriptionStatus: "ACTIVE",
    subscriptionStartedAt: now,
    subscriptionEndsAt,
    updatedAt: now,
  });
  await requestRef.update({
    status: "approved",
    reviewedAt: FieldValue.serverTimestamp(),
    reviewedBy: input.reviewerId,
  });

  await notifyOrgAdmins(request.organizationId, org.adminIds ?? [], {
    actorId: input.reviewerId,
    type: "subscription_approved",
    title: `${request.requestedPlan === "PREMIUM" ? "Premium" : "Crazy"} plan active`,
    message: `Your organization's ${request.requestedPlan === "PREMIUM" ? "Premium" : "Crazy"} plan request was approved.`,
    href: "/admin/billing",
  });

  const snap = await requestRef.get();
  return requestFromDoc(snap);
}

export interface RejectSubscriptionRequestInput {
  requestId: string;
  reviewerId: string;
  rejectionReason?: string;
}

/** Rejects a pending request. The organization's plan/subscriptionStatus are left alone here — access continues to be governed purely by hasPlatformAccess()'s trial-window check (see that function's own comment for why). */
export async function rejectSubscriptionRequest(input: RejectSubscriptionRequestInput): Promise<SubscriptionRequest> {
  const db = getAdminDb();
  const requestRef = db.collection("subscriptionRequests").doc(input.requestId);
  const requestSnap = await requestRef.get();
  if (!requestSnap.exists) throw new ApiError(404, "Subscription request not found.");
  const request = requestSnap.data()!;
  if (request.status !== "pending") throw new ApiError(409, "This request has already been reviewed.");

  const orgSnap = await db.collection("organizations").doc(request.organizationId).get();
  if (!orgSnap.exists) throw new ApiError(404, "The requesting organization no longer exists.");
  const org = orgSnap.data()!;

  await requestRef.update({
    status: "rejected",
    reviewedAt: FieldValue.serverTimestamp(),
    reviewedBy: input.reviewerId,
    rejectionReason: input.rejectionReason?.trim() || null,
  });

  await notifyOrgAdmins(request.organizationId, org.adminIds ?? [], {
    actorId: input.reviewerId,
    type: "subscription_rejected",
    title: "Plan request rejected",
    message: `Your organization's ${request.requestedPlan === "PREMIUM" ? "Premium" : "Crazy"} plan request was not approved.`,
    href: "/admin/billing",
  });

  const snap = await requestRef.get();
  return requestFromDoc(snap);
}
