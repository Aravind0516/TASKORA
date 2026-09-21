import { collection, onSnapshot, orderBy, query, where, type QueryDocumentSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { getFirestoreErrorMessage } from "@/lib/firebase/firestore-errors";
import { toIso } from "@/lib/firebase/timestamp";
import { apiFetch } from "@/lib/api-client";
import type { OrganizationRegistrationRequest } from "@/types/organization-registration";

// Reads go straight through the client SDK (rules-scoped: a requester sees
// only their own request, Super Admin sees all — see firestore.rules'
// organizationRegistrationRequests block). Every WRITE besides the initial
// submit (approve, reject, any status/review field) goes through
// app/api/superadmin/organization-registrations/* instead — the rules deny
// every client update outright, by design.

function requestFromDoc(docSnap: QueryDocumentSnapshot): OrganizationRegistrationRequest {
  const data = docSnap.data();
  return {
    id: docSnap.id,
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
    submittedAt: toIso(data.submittedAt),
    reviewedAt: data.reviewedAt ? toIso(data.reviewedAt) : null,
    reviewedBy: data.reviewedBy ?? null,
    reviewerComment: data.reviewerComment ?? null,
    createdUserId: data.createdUserId,
    approvedOrganizationId: data.approvedOrganizationId ?? null,
  };
}

/** Every registration request, newest first — Super Admin only, enforced by firestore.rules. */
export function subscribeToOrganizationRegistrations(
  onData: (requests: OrganizationRegistrationRequest[]) => void,
  onError: (message: string) => void
): () => void {
  const q = query(collection(db, "organizationRegistrationRequests"), orderBy("submittedAt", "desc"));
  return onSnapshot(
    q,
    (snapshot) => onData(snapshot.docs.map(requestFromDoc)),
    (error) => onError(getFirestoreErrorMessage(error, "organizationRegistrationRequests:all"))
  );
}

/** The signed-in account's own registration request, if any — backs the "Registration Pending"/"Registration Not Approved" states shown before an organization exists. */
export function subscribeToMyOrganizationRegistration(
  uid: string,
  onData: (request: OrganizationRegistrationRequest | null) => void,
  onError: (message: string) => void
): () => void {
  const q = query(collection(db, "organizationRegistrationRequests"), where("createdUserId", "==", uid));
  return onSnapshot(
    q,
    (snapshot) => onData(snapshot.empty ? null : requestFromDoc(snapshot.docs[0])),
    (error) => onError(getFirestoreErrorMessage(error, "organizationRegistrationRequests:mine"))
  );
}

export interface SubmitOrganizationRegistrationInput {
  phone?: string;
  organizationName: string;
  organizationType?: string;
  industry?: string;
  website?: string;
  location?: string;
  organizationSize?: string;
  description?: string;
}

export function submitOrganizationRegistration(
  input: SubmitOrganizationRegistrationInput
): Promise<{ request: OrganizationRegistrationRequest }> {
  return apiFetch<{ request: OrganizationRegistrationRequest }>("/api/organization-registration", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function approveOrganizationRegistration(requestId: string): Promise<{ request: OrganizationRegistrationRequest }> {
  return apiFetch<{ request: OrganizationRegistrationRequest }>(`/api/superadmin/organization-registrations/${requestId}/approve`, {
    method: "POST",
  });
}

export function rejectOrganizationRegistration(requestId: string, reviewerComment: string): Promise<{ request: OrganizationRegistrationRequest }> {
  return apiFetch<{ request: OrganizationRegistrationRequest }>(`/api/superadmin/organization-registrations/${requestId}/reject`, {
    method: "POST",
    body: JSON.stringify({ reviewerComment }),
  });
}
