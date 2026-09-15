import { collection, onSnapshot, orderBy, query, where, type QueryDocumentSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { getFirestoreErrorMessage } from "@/lib/firebase/firestore-errors";
import { toIso } from "@/lib/firebase/timestamp";
import { apiFetch } from "@/lib/api-client";
import type { RequestablePlan, SubscriptionRequest } from "@/types/subscription-request";

// Reads go straight through the client SDK (rules-scoped: an org's Admin
// sees only their own org's requests, Super Admin sees all — see
// firestore.rules' subscriptionRequests block). Every WRITE (create,
// approve, reject) goes through app/api/subscription-requests/* instead —
// `allow write: if false` in the rules means a direct client write here
// would simply be denied, by design.

function requestFromDoc(docSnap: QueryDocumentSnapshot): SubscriptionRequest {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    organizationId: data.organizationId,
    organizationName: data.organizationName,
    requestedBy: data.requestedBy,
    requestedByEmail: data.requestedByEmail,
    requestedByName: data.requestedByName,
    requestedPlan: data.requestedPlan,
    status: data.status,
    createdAt: toIso(data.createdAt),
    reviewedAt: data.reviewedAt ? toIso(data.reviewedAt) : null,
    reviewedBy: data.reviewedBy ?? null,
    rejectionReason: data.rejectionReason ?? null,
  };
}

/** One organization's own subscription requests, newest first — used by the Admin billing page. */
export function subscribeToOrgSubscriptionRequests(
  organizationId: string,
  onData: (requests: SubscriptionRequest[]) => void,
  onError: (message: string) => void
): () => void {
  const q = query(collection(db, "subscriptionRequests"), where("organizationId", "==", organizationId), orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    (snapshot) => onData(snapshot.docs.map(requestFromDoc)),
    (error) => onError(getFirestoreErrorMessage(error, "subscriptionRequests"))
  );
}

/** Every organization's requests, newest first — Super Admin only, enforced by firestore.rules. */
export function subscribeToAllSubscriptionRequests(
  onData: (requests: SubscriptionRequest[]) => void,
  onError: (message: string) => void
): () => void {
  const q = query(collection(db, "subscriptionRequests"), orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    (snapshot) => onData(snapshot.docs.map(requestFromDoc)),
    (error) => onError(getFirestoreErrorMessage(error, "subscriptionRequests:all"))
  );
}

export function requestPlan(requestedPlan: RequestablePlan): Promise<{ request: SubscriptionRequest }> {
  return apiFetch<{ request: SubscriptionRequest }>("/api/subscription-requests", {
    method: "POST",
    body: JSON.stringify({ requestedPlan }),
  });
}

export function approveSubscriptionRequest(requestId: string): Promise<{ request: SubscriptionRequest }> {
  return apiFetch<{ request: SubscriptionRequest }>(`/api/subscription-requests/${requestId}/approve`, { method: "POST" });
}

export function rejectSubscriptionRequest(requestId: string, rejectionReason?: string): Promise<{ request: SubscriptionRequest }> {
  return apiFetch<{ request: SubscriptionRequest }>(`/api/subscription-requests/${requestId}/reject`, {
    method: "POST",
    body: JSON.stringify({ rejectionReason }),
  });
}
