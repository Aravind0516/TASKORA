import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { ApiError } from "@/lib/server/api-response";
import { claimNewOrganizationForSelf } from "@/lib/server/organizations";
import { notifySuperAdmins, writeNotification } from "@/lib/server/notifications";
import type { OrganizationRegistrationRequest } from "@/types/organization-registration";

// No organization exists yet for a submission-time or rejection-time
// notification — notifications/{id}.organizationId is a required string
// field (see lib/server/notifications.ts), so this sentinel stands in for
// "not yet an organization." Never matched against a real organizations/{id}
// document anywhere (firestore.rules' notifications read rule only checks
// userId), so it can never be confused with real org-scoped data.
const NO_ORG_YET = "platform";

function requestFromDoc(doc: FirebaseFirestore.DocumentSnapshot): OrganizationRegistrationRequest {
  const data = doc.data()!;
  return {
    id: doc.id,
    fullName: data.fullName,
    email: data.email,
    phone: data.phone ?? null,
    organizationName: data.organizationName,
    organizationType: data.organizationType ?? null,
    industry: data.industry ?? null,
    website: data.website ?? null,
    location: data.location ?? null,
    organizationSize: data.organizationSize ?? null,
    description: data.description ?? null,
    status: data.status,
    submittedAt: data.submittedAt?.toDate?.().toISOString() ?? new Date().toISOString(),
    reviewedAt: data.reviewedAt?.toDate?.().toISOString() ?? null,
    reviewedBy: data.reviewedBy ?? null,
    reviewerComment: data.reviewerComment ?? null,
    createdUserId: data.createdUserId,
    approvedOrganizationId: data.approvedOrganizationId ?? null,
  };
}

export interface SubmitOrganizationRegistrationInput {
  uid: string;
  fullName: string;
  email: string;
  phone?: string;
  organizationName: string;
  organizationType?: string;
  industry?: string;
  website?: string;
  location?: string;
  organizationSize?: string;
  description?: string;
}

/**
 * Step 2 of "Register a new organization" — creates ONLY the review-queue
 * document. Never creates an organization, never touches the caller's role/
 * organizationId/custom claims. The caller (app/api/organization-registration/
 * route.ts) has already verified this is a real, signed-in, org-less account
 * — refused outright (409) if that account already has a pending or
 * previously-approved request, so resubmitting can never queue duplicates or
 * spawn a second organization for the same person.
 */
export async function submitOrganizationRegistration(input: SubmitOrganizationRegistrationInput): Promise<OrganizationRegistrationRequest> {
  const db = getAdminDb();

  const existing = await db
    .collection("organizationRegistrationRequests")
    .where("createdUserId", "==", input.uid)
    .where("status", "in", ["PENDING", "APPROVED"])
    .limit(1)
    .get();
  if (!existing.empty) {
    const status = existing.docs[0].data().status;
    throw new ApiError(
      409,
      status === "APPROVED"
        ? "Your organization registration has already been approved."
        : "You already have a registration request awaiting review."
    );
  }

  const ref = db.collection("organizationRegistrationRequests").doc();
  await ref.set({
    fullName: input.fullName,
    email: input.email,
    phone: input.phone?.trim() || null,
    organizationName: input.organizationName,
    organizationType: input.organizationType?.trim() || null,
    industry: input.industry?.trim() || null,
    website: input.website?.trim() || null,
    location: input.location?.trim() || null,
    organizationSize: input.organizationSize?.trim() || null,
    description: input.description?.trim() || null,
    status: "PENDING",
    submittedAt: FieldValue.serverTimestamp(),
    reviewedAt: null,
    reviewedBy: null,
    reviewerComment: null,
    createdUserId: input.uid,
    approvedOrganizationId: null,
  });

  await notifySuperAdmins({
    organizationId: NO_ORG_YET,
    actorId: input.uid,
    type: "organization_registration_submitted",
    title: "New organization registration",
    message: `${input.fullName} requested to register "${input.organizationName}".`,
    href: "/superadmin/organization-requests",
  });

  const snap = await ref.get();
  return requestFromDoc(snap);
}

export interface ReviewOrganizationRegistrationInput {
  requestId: string;
  reviewerId: string;
}

/**
 * Approves a pending request: creates and activates a real organization,
 * then grants ITS creator (request.createdUserId — never the reviewer)
 * admin of it. Idempotent by construction: the status flip from PENDING to
 * APPROVED happens inside a Firestore transaction FIRST, before any
 * organization is created — a concurrent second approval attempt (e.g. a
 * double-click) reads the already-non-PENDING status inside its own
 * transaction and fails with 409 before ever calling createOrganization(),
 * so at most one organization is ever created per request.
 */
export async function approveOrganizationRegistration(input: ReviewOrganizationRegistrationInput): Promise<OrganizationRegistrationRequest> {
  const db = getAdminDb();
  const requestRef = db.collection("organizationRegistrationRequests").doc(input.requestId);

  const claimedRequest = await db.runTransaction(async (tx) => {
    const snap = await tx.get(requestRef);
    if (!snap.exists) throw new ApiError(404, "Registration request not found.");
    const data = snap.data()!;
    if (data.status !== "PENDING") throw new ApiError(409, "This request has already been reviewed.");
    tx.update(requestRef, {
      status: "APPROVED",
      reviewedAt: FieldValue.serverTimestamp(),
      reviewedBy: input.reviewerId,
    });
    return {
      createdUserId: data.createdUserId as string,
      organizationName: data.organizationName as string,
      description: (data.description as string | null | undefined) ?? null,
    };
  });

  const organization = await claimNewOrganizationForSelf({
    uid: claimedRequest.createdUserId,
    name: claimedRequest.organizationName,
    description: claimedRequest.description ?? "",
  });

  await requestRef.update({ approvedOrganizationId: organization.id });

  await writeNotification({
    userId: claimedRequest.createdUserId,
    organizationId: organization.id,
    actorId: input.reviewerId,
    type: "organization_registration_approved",
    title: "Organization approved",
    message: `Your TASKORA organization registration for "${claimedRequest.organizationName}" has been approved.`,
    href: "/admin",
  });

  const snap = await requestRef.get();
  return requestFromDoc(snap);
}

export interface RejectOrganizationRegistrationInput {
  requestId: string;
  reviewerId: string;
  reviewerComment: string;
}

/** Rejects a pending request — never creates an organization, never grants access. Same transactional double-submit guard as approve. */
export async function rejectOrganizationRegistration(input: RejectOrganizationRegistrationInput): Promise<OrganizationRegistrationRequest> {
  const db = getAdminDb();
  const requestRef = db.collection("organizationRegistrationRequests").doc(input.requestId);

  const claimedRequest = await db.runTransaction(async (tx) => {
    const snap = await tx.get(requestRef);
    if (!snap.exists) throw new ApiError(404, "Registration request not found.");
    const data = snap.data()!;
    if (data.status !== "PENDING") throw new ApiError(409, "This request has already been reviewed.");
    tx.update(requestRef, {
      status: "REJECTED",
      reviewedAt: FieldValue.serverTimestamp(),
      reviewedBy: input.reviewerId,
      reviewerComment: input.reviewerComment,
    });
    return {
      createdUserId: data.createdUserId as string,
      organizationName: data.organizationName as string,
    };
  });

  await writeNotification({
    userId: claimedRequest.createdUserId,
    organizationId: NO_ORG_YET,
    actorId: input.reviewerId,
    type: "organization_registration_rejected",
    title: "Registration not approved",
    message: `Your TASKORA organization registration for "${claimedRequest.organizationName}" was not approved.`,
    href: "/register",
  });

  const snap = await requestRef.get();
  return requestFromDoc(snap);
}

export async function getMyOrganizationRegistration(uid: string): Promise<OrganizationRegistrationRequest | null> {
  const snap = await getAdminDb()
    .collection("organizationRegistrationRequests")
    .where("createdUserId", "==", uid)
    .limit(1)
    .get();
  if (snap.empty) return null;
  return requestFromDoc(snap.docs[0]);
}
