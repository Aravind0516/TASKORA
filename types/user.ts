import type { FieldValue, Timestamp } from "firebase/firestore";

// "super_admin" is never assignable by any client write — see firestore.rules
// and lib/server/auth.ts. It is granted only via a trusted server-side
// operation (a bootstrap script setting the Admin SDK custom claim — see
// scripts/bootstrap-super-admin.mjs). Uses the same "super_admin" spelling
// as the existing frontend-phase PlatformRole (types/platform.ts) and demo
// role switcher, rather than the request's literal "superadmin", so none of
// that already-built, already-working code needed to change.
export type UserRole = "super_admin" | "admin" | "user";
export type UserStatus = "active" | "invited" | "suspended";

/**
 * Employment classification — entirely separate from UserRole (authorization)
 * and FunctionalRole (job specialty). Determines only whether the premium
 * intern dashboard/credits/leaderboard surfaces render for this account.
 * Optional and unset for every account created before this field existed
 * (all pre-existing Admin/Manager/Employee accounts) — never required, never
 * backfilled, so nothing about an existing account changes by default.
 */
export const EMPLOYMENT_TYPES = ["EMPLOYEE", "INTERN"] as const;
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];

/**
 * What a person actually does within the organization/project — entirely
 * separate from UserRole (which governs authorization). Never grants
 * Admin/Super Admin permissions; display + selector metadata only.
 */
export const FUNCTIONAL_ROLES = [
  "Full Stack Developer",
  "Frontend Developer",
  "Backend Developer",
  "AI/ML Engineer",
  "Data Analyst",
  "UI/UX Designer",
  "QA / Tester",
  "DevOps / Cloud Engineer",
  "Project Manager",
] as const;
export type FunctionalRole = (typeof FUNCTIONAL_ROLES)[number];

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  /** null until the user belongs to an organization (accepted an invitation, or is the org's creating admin). */
  organizationId: string | null;
  teamIds: string[];
  /** Optional job title shown in team/user directories — display only, not an authorization concept. */
  title?: string;
  /** What this person does on their team/projects — separate from `role`, never authorization. Unset until an Admin assigns one. */
  functionalRole?: FunctionalRole;
  /** Per-user notification opt-in/out, keyed by a fixed set of preference ids (see components/settings/settings-view.tsx). Self-editable only; unset = all defaults on. */
  notificationPreferences?: Record<string, boolean>;
  status: UserStatus;

  // ── Intern/candidate identity fields (all optional — see EmploymentType
  // above) ─────────────────────────────────────────────────────────────
  /** Admin-assigned application identifier (e.g. "NXT26-IT-0001"), globally unique via userIdReservations/{userId} — see lib/server/user-ids.ts. Immutable from the client once set; never client-editable. */
  userId?: string;
  employmentType?: EmploymentType;
  collegeName?: string;
  branch?: string;
  passedOutYear?: number;
  /** Free text — "Final Year", "Graduated", etc. */
  academicYear?: string;
  domain?: string;
  secondaryDomain?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  phone?: string;

  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
}

/** Read shape — createdAt/updatedAt converted to ISO strings at the service boundary (lib/firebase/timestamp.ts), same convention as every other collection's client-facing type. */
export interface UserRecord extends Omit<UserProfile, "createdAt" | "updatedAt"> {
  id: string;
  createdAt: string;
  updatedAt: string;
}
