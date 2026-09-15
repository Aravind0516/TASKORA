export type ProjectStatus = "Planning" | "Active" | "On Hold" | "Completed";

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
  createdAt: string;
  updatedAt: string;
}
