export type ProjectStatus = "Planning" | "Active" | "On Hold" | "Completed";

/**
 * A project's own single official requirement document (PDF/DOC/DOCX) —
 * one slot per project, replace-only, never a list. Embedded directly on
 * the project document (never a separate Firestore collection) so its read
 * authorization is exactly the project's own existing privacy boundary
 * (isAuthorizedForProject) with no new Firestore rule needed. `version`
 * increments on every replace and is the storage path's own version
 * segment — see lib/services/project-requirement.service.ts.
 */
export interface ProjectRequirementDocument {
  fileName: string;
  storagePath: string;
  contentType: string;
  size: number;
  uploadedBy: string;
  uploadedAt: string;
  version: number;
}

export type ProjectPriority = "Low" | "Medium" | "High" | "Critical";

/** Phase 1 of Work Verification: a repository URL is evidence context only — TASKORA never calls the GitHub API or trusts commit counts. See lib/services/daily-work-update.service.ts. */
export type RepositoryProvider = "NONE" | "GITHUB";

/** Only one value exists today — modeled as a literal union (not a plain boolean) so a future WEEKLY/adhoc cadence doesn't require a schema migration. */
export type VerificationFrequency = "DAILY";

export interface Project {
  id: string;
  /** Multi-tenancy boundary — every query and security rule is scoped by this field, never by ownerId alone. */
  organizationId: string;
  teamId: string;
  name: string;
  description: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  progress: number;
  startDate: string;
  dueDate: string;
  ownerId: string;
  /** Project-scoped manager (PROJECT_MANAGER-equivalent) — a `user` granted elevated permissions on THIS project only. null until an Admin assigns one; never required to create a project. */
  managerId: string | null;
  memberIds: string[];
  archived: boolean;
  /** Evidence context only (e.g. shown next to an intern's GITHUB_* evidence links) — never used for automatic verification. Optional; absent on every project created before this field existed. */
  repositoryUrl: string | null;
  repositoryProvider: RepositoryProvider;
  /**
   * Work Verification (Daily Work Updates) — see types/daily-work-update.ts.
   * Off by default so every existing project's behavior is completely
   * unchanged: no tab appears, no update is ever expected, until an Admin
   * deliberately turns this on for a given project.
   */
  workVerificationEnabled: boolean;
  verificationFrequency: VerificationFrequency;
  /**
   * The formal "submitted" milestone that drives PROJECT_SUBMISSION /
   * ON_TIME_PROJECT credit automation (see lib/server/project-submission.ts)
   * — deliberately NOT the same thing as status "Completed", which is a
   * plain workflow state any manager can toggle back and forth. Submission
   * is a one-way, server-timestamped event; absent/"NONE" on every project
   * created before this field existed, so nothing about an existing
   * project's behavior changes until its manager/admin explicitly submits.
   */
  submissionStatus: "NONE" | "SUBMITTED";
  /** Server timestamp (never the browser clock) set exactly once, at submission — see lib/server/project-submission.ts. null until submitted. */
  submittedAt: string | null;
  /** null until an Admin/authorized manager uploads one — every project continues working normally without it. */
  requirementDocument: ProjectRequirementDocument | null;
  /**
   * Plain-text project requirements — an Admin/authorized manager writes
   * scope, deliverables, technologies, and instructions directly, no
   * Firebase Storage involved. Deliberately a separate field from
   * `requirementDocument` (the PDF/DOC upload) rather than a replacement
   * for it — a project can have either, both, or neither. Empty string
   * (never null/undefined) means "no requirements written yet," matching
   * every other plain-text project field (e.g. `description`).
   */
  requirements: string;
  createdAt: string;
  updatedAt: string;
}
