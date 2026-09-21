import { collection, onSnapshot, query, where, type QueryDocumentSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { getFirestoreErrorMessage } from "@/lib/firebase/firestore-errors";
import { apiFetch, publicApiFetch } from "@/lib/api-client";
import type { InvitationRole, PlatformInvitation, PublicInvitationView } from "@/types/invitation";
import type { EmploymentType, FunctionalRole } from "@/types/user";

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
    projectIds: data.projectIds ?? [],
    functionalRole: data.functionalRole ?? null,
    employmentType: data.employmentType ?? null,
    userId: data.userId ?? null,
    collegeName: data.collegeName ?? null,
    branch: data.branch ?? null,
    passedOutYear: data.passedOutYear ?? null,
    academicYear: data.academicYear ?? null,
    domain: data.domain ?? null,
    secondaryDomain: data.secondaryDomain ?? null,
    linkedinUrl: data.linkedinUrl ?? null,
    githubUrl: data.githubUrl ?? null,
    phone: data.phone ?? null,
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
  projectIds?: string[];
  functionalRole?: FunctionalRole | null;
  employmentType?: EmploymentType | null;
  userId?: string | null;
  collegeName?: string | null;
  branch?: string | null;
  passedOutYear?: number | null;
  academicYear?: string | null;
  domain?: string | null;
  secondaryDomain?: string | null;
  linkedinUrl?: string | null;
  githubUrl?: string | null;
  phone?: string | null;
}): Promise<CreateInvitationResponse> {
  return apiFetch<CreateInvitationResponse>("/api/invitations", { method: "POST", body: JSON.stringify(input) });
}

interface CheckUserIdResponse {
  available: boolean;
  reason: "invalid-format" | "taken" | null;
}

/** Debounce this on the caller's side — it fires on every keystroke otherwise. Admin/Super Admin only per the route's own auth check. */
export function checkUserIdAvailable(userId: string): Promise<CheckUserIdResponse> {
  return apiFetch<CheckUserIdResponse>(`/api/invitations/check-user-id?userId=${encodeURIComponent(userId)}`);
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

