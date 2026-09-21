// Platform-level types for the Super Admin / Admin experience.
// This models a multi-organization platform on top of TASKORA's existing
// single-tenant user app. All data here is mock-only for this phase — see
// lib/mock-data/platform-data.ts. Shapes are intentionally close to what the
// eventual Firestore documents will look like so backend integration later
// is a data-source swap, not a type rewrite.

import type { FunctionalRole } from "./user";

export type PlatformRole = "super_admin" | "admin" | "user";

export type OrgStatus = "Active" | "Suspended";
// Manual-approval subscription model — mirrors types/organization.ts's
// OrganizationPlan/SubscriptionStatus exactly (same spelling, no Title-Case
// translation like OrgStatus gets), since these values are shown verbatim in
// the Super Admin/Admin UI rather than needing a display-friendly remap.
export type OrgPlan = "TRIAL" | "PREMIUM" | "CRAZY";
export type SubscriptionStatus = "TRIAL" | "PENDING" | "ACTIVE" | "REJECTED" | "EXPIRED";
export type PersonStatus = "Active" | "Invited" | "Suspended";

export interface Organization {
  id: string;
  name: string;
  description: string;
  industry: string;
  contactEmail: string;
  plan: OrgPlan;
  subscriptionStatus: SubscriptionStatus;
  trialStartedAt: string;
  trialEndsAt: string;
  subscriptionStartedAt: string | null;
  subscriptionEndsAt: string | null;
  status: OrgStatus;
  adminId: string;
  createdAt: string;
  lastActivityAt: string;
}

export interface PlatformAdmin {
  id: string;
  organizationId: string;
  name: string;
  email: string;
  status: PersonStatus;
  joinedAt: string;
  lastActiveAt: string;
}

export interface PlatformUser {
  id: string;
  organizationId: string;
  name: string;
  email: string;
  title: string;
  /** What this person does on their team/projects — separate from platform role, never authorization. Undefined until an Admin assigns one. */
  functionalRole?: FunctionalRole;
  teamIds: string[];
  projectIds: string[];
  status: PersonStatus;
  joinedAt: string;
  lastActiveAt: string;
  /** Personal notification opt-in/out — read (never written) here so the admin console can gate PHASE F notification fan-out the same way the individual shell does, without an extra Firestore read per recipient. Only ever meaningful for the signed-in user's own record when displayed. */
  notificationPreferences?: Record<string, boolean>;
  /** Admin-assigned Candidate/User ID — undefined for accounts created before this field existed or that never had one set. */
  userId?: string;
  employmentType?: "EMPLOYEE" | "INTERN";
  collegeName?: string;
  branch?: string;
  passedOutYear?: number;
  domain?: string;
  linkedinUrl?: string;
  githubUrl?: string;
}

export interface PlatformTeam {
  id: string;
  organizationId: string;
  name: string;
  description: string;
  leadId: string;
  memberIds: string[];
  projectIds: string[];
  createdAt: string;
}

export type PlatformProjectStatus = "Planning" | "Active" | "On Hold" | "Completed";
export type PlatformPriority = "Low" | "Medium" | "High" | "Critical";

export interface PlatformProject {
  id: string;
  organizationId: string;
  teamId: string;
  name: string;
  description: string;
  ownerId: string;
  /** Project-scoped manager (PROJECT_MANAGER-equivalent) — null until an Admin assigns one. */
  managerId: string | null;
  memberIds: string[];
  status: PlatformProjectStatus;
  priority: PlatformPriority;
  progress: number;
  startDate: string;
  dueDate: string;
  archived: boolean;
  repositoryUrl: string | null;
  repositoryProvider: "NONE" | "GITHUB";
  workVerificationEnabled: boolean;
  verificationFrequency: "DAILY";
  createdAt: string;
  updatedAt: string;
}

export type PlatformTaskStatus = "Backlog" | "To Do" | "In Progress" | "In Review" | "Blocked" | "Completed";

export interface PlatformTask {
  id: string;
  organizationId: string;
  projectId: string;
  /** Creator of the task (not necessarily the assignee) — used to resolve PHASE F comment-notification recipients. */
  ownerId: string;
  title: string;
  description: string;
  status: PlatformTaskStatus;
  priority: PlatformPriority;
  assigneeId: string | null;
  /** Reviews the completed work — descriptive only, never an authorization concept. */
  reviewerId?: string | null;
  estimatedHours?: number | null;
  actualHours?: number | null;
  dueDate: string;
  createdAt: string;
  updatedAt: string;
}

export type PlatformActivityAction =
  | "organization_created"
  | "organization_suspended"
  | "organization_activated"
  | "admin_registered"
  | "admin_suspended"
  | "user_invited"
  | "user_joined"
  | "team_created"
  | "project_created"
  | "project_completed"
  | "user_assigned"
  | "task_completed";

export interface PlatformActivityEntry {
  id: string;
  organizationId: string;
  actorId: string;
  actorName: string;
  action: PlatformActivityAction;
  entityType: "organization" | "admin" | "user" | "team" | "project" | "task";
  entityName: string;
  createdAt: string;
}

export type ServiceHealth = "Healthy" | "Warning" | "Critical";

export interface SystemServiceStatus {
  id: string;
  name: string;
  status: ServiceHealth;
  uptimePct: number;
  latencyMs: number;
  lastIncidentAt: string | null;
}
