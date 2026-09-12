import { collection, onSnapshot, query, where, type QueryDocumentSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { getFirestoreErrorMessage } from "@/lib/firebase/firestore-errors";
import { apiFetch, publicApiFetch } from "@/lib/api-client";
import type { InvitationRole, PlatformInvitation, PublicInvitationView } from "@/types/invitation";
import type { FunctionalRole } from "@/types/user";

// Reads go straight to Firestore (real-time, rules-enforced — see
// firestore.rules' `invitations` block: admin/superadmin read-only).
// Every write goes through app/api/invitations/* instead, because creating/
// resending/cancelling/accepting all need the Admin SDK (token hashing,
// Firebase Auth account creation, atomic membership writes) — see
// lib/server/invitations.ts.

function invitationFromDoc(docSnap: QueryDocumentSnapshot): PlatformInvitation {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    organizationId: data.organizationId,
    invitedBy: data.invitedBy,
    email: data.email,
    name: data.name,
    role: data.role,
    teamId: data.teamId ?? null,
    functionalRole: data.functionalRole ?? null,
    emailSent: data.emailSent ?? false,
    status: data.status,
    tokenHash: data.tokenHash,
    expiresAt: data.expiresAt,
    createdAt: data.createdAt,
    acceptedAt: data.acceptedAt ?? null,
    cancelledAt: data.cancelledAt ?? null,
  };
}

export function subscribeToInvitations(
  organizationId: string,
  onData: (invitations: PlatformInvitation[]) => void,
  onError: (message: string) => void
): () => void {
  const q = query(collection(db, "invitations"), where("organizationId", "==", organizationId));
  return onSnapshot(
    q,
    (snapshot) =>
      onData(snapshot.docs.map(invitationFromDoc).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())),
    (error) => onError(getFirestoreErrorMessage(error, "invitations"))
  );
}

/** Super Admin only — enforced by firestore.rules. */
export function subscribeToAllInvitations(
  onData: (invitations: PlatformInvitation[]) => void,
  onError: (message: string) => void
): () => void {
  return onSnapshot(
    collection(db, "invitations"),
    (snapshot) => onData(snapshot.docs.map(invitationFromDoc)),
    (error) => onError(getFirestoreErrorMessage(error, "invitations:all"))
  );
}

interface CreateInvitationResponse {
  invitation: PlatformInvitation;
  /** Only ever present in this one response — the raw token can't be recovered later, only tokenHash is stored. */
  invitationUrl: string;
  emailSent: boolean;
  emailError: string | null;
}

export function createInvitation(input: {
  organizationId: string;
  name: string;
  email: string;
  role: InvitationRole;
  teamId: string | null;
  functionalRole?: FunctionalRole | null;
}): Promise<CreateInvitationResponse> {
  return apiFetch<CreateInvitationResponse>("/api/invitations", { method: "POST", body: JSON.stringify(input) });
}

export function resendInvitation(invitationId: string): Promise<CreateInvitationResponse> {
  return apiFetch<CreateInvitationResponse>(`/api/invitations/${invitationId}/resend`, { method: "POST" });
}

export function cancelInvitation(invitationId: string): Promise<void> {
  return apiFetch<void>(`/api/invitations/${invitationId}/cancel`, { method: "POST" });
}

export function getPublicInvitation(token: string): Promise<{ invitation: PublicInvitationView }> {
  return publicApiFetch<{ invitation: PublicInvitationView }>(`/api/invitations/token/${token}`);
}

export function acceptInvitation(input: { token: string; name: string; password: string }): Promise<{ uid: string; organizationId: string }> {
  return publicApiFetch<{ uid: string; organizationId: string }>("/api/invitations/accept", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

