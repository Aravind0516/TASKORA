// Invitation data contract. Backed by Firestore's `invitations` collection —
// all writes go through server-side Route Handlers (app/api/invitations/*)
// using the Firebase Admin SDK, never direct client writes (see
// firestore.rules: the invitations collection denies all client access).

import type { EmploymentType, FunctionalRole } from "./user";

export type InvitationStatus = "pending" | "accepted" | "expired" | "cancelled";

/** Public registration only ever creates "user". "admin" is issued only via the Super Admin → Add Administrator flow. */
export type InvitationRole = "admin" | "user";

export interface PlatformInvitation {
  id: string;
  organizationId: string;
  invitedBy: string;
  email: string;
  name: string;
  role: InvitationRole;
  /** null for an "admin" invitation — admins aren't scoped to one team. */
  teamId: string | null;
  /** Project(s) this person will be added to (memberIds arrayUnion) at acceptance — empty for an "admin" invitation. */
  projectIds: string[];
  /** What this person will do on their team/projects once they join — separate from `role`. null if not set at invite time. */
  functionalRole: FunctionalRole | null;
  /** EMPLOYEE (default) or INTERN — see types/user.ts. null for an "admin" invitation. */
  employmentType: EmploymentType | null;
  /** The Admin-assigned application identifier (e.g. "NXT26-IT-0001") — reserved atomically at invite-creation time (see lib/server/user-ids.ts), copied onto users/{uid} at acceptance. null when not set. */
  userId: string | null;
  collegeName: string | null;
  branch: string | null;
  passedOutYear: number | null;
  academicYear: string | null;
  domain: string | null;
  secondaryDomain: string | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
  phone: string | null;
  /** Whether the LAST send attempt (at creation or via a manual "Send Email") was actually accepted by the email provider — distinct from `status`, which tracks acceptance, not delivery. */
  emailSent: boolean;
  status: InvitationStatus;
  /**
   * SHA-256 hash of the one-time acceptance token. The raw token is never
   * persisted — it exists only in the invitation email URL and briefly in
   * memory on the server while hashing it. See lib/server/invitations.ts.
   */
  tokenHash: string;
  expiresAt: string;
  createdAt: string;
  acceptedAt: string | null;
  cancelledAt: string | null;
}

/** Safe subset returned to the public /invite/[token] page — never the tokenHash, invitedBy uid, or any OTHER candidate's data. */
export interface PublicInvitationView {
  status: InvitationStatus;
  organizationName: string;
  teamName: string | null;
  /** Resolved from the invitation's own projectIds — never exposes any project the candidate wasn't actually assigned to. */
  projectNames: string[];
  role: InvitationRole;
  name: string;
  email: string;
  /** Shown on the acceptance summary ("Your Candidate ID: NXT26-IT-0001") — null when not set for this invitation. */
  userId: string | null;
  collegeName: string | null;
  domain: string | null;
}
