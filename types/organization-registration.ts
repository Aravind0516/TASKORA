// A prospective organization owner's request to bring their own organization
// onto TASKORA — reviewed manually by a Super Admin before any organization
// is actually created. Deliberately separate from the instant self-serve
// claim path (lib/server/organizations.ts's claimNewOrganizationForSelf,
// still present but no longer called by any UI — see CLAUDE.md): submitting
// this request creates ONLY this document, never an organization, never
// admin claims. One flat top-level collection
// (`organizationRegistrationRequests`), matching this app's existing
// pattern for review-queue collections (subscriptionRequests, invitations).

export type OrganizationRegistrationStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface OrganizationRegistrationRequest {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  organizationName: string;
  organizationType: string | null;
  industry: string | null;
  website: string | null;
  location: string | null;
  organizationSize: string | null;
  description: string | null;
  status: OrganizationRegistrationStatus;
  submittedAt: string;
  reviewedAt: string | null;
  /** uid of the Super Admin who approved/rejected — null until reviewed. */
  reviewedBy: string | null;
  /** Only ever set when status is "REJECTED"; null otherwise. */
  reviewerComment: string | null;
  /** The Firebase Auth account created at Step 1 of registration (role "user", organizationId null until approval) — this request belongs to this uid, and only this uid can ever be granted admin of the resulting organization. */
  createdUserId: string;
  /** Set only on approval — the real organizations/{id} created for this request. */
  approvedOrganizationId: string | null;
}
