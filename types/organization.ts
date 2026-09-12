// This is the REAL Firestore-facing shape (lowercase status, per the backend
// data contract). components/platform/* keeps its own display-facing
// `Organization` type in types/platform.ts (Title Case status, matching the
// shared StatusBadge/PersonStatusBadge components already built) — the two
// are bridged in components/platform/platform-provider.tsx, not aliased,
// so no view component needed to change when this backend phase landed.
export type OrganizationStatus = "active" | "suspended";
export type OrganizationPlan = "Free" | "Pro" | "Business";

export interface OrganizationDoc {
  id: string;
  name: string;
  slug: string;
  description: string;
  industry?: string;
  contactEmail?: string;
  plan: OrganizationPlan;
  ownerId: string;
  adminIds: string[];
  memberIds: string[];
  status: OrganizationStatus;
  createdAt: string;
  updatedAt: string;
}
