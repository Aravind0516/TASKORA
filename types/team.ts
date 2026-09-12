import type { FunctionalRole } from "./user";

// Team-position display label (orthogonal to the account-level UserRole in
// types/user.ts, which governs authorization). Simplified from a former
// three-value enum to match what the backend can actually derive: whether a
// member is the organization's admin, or a regular team member.
export type UserRole = "Admin" | "Team Member";

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  title: string;
  /** What this person does on their team/projects (e.g. "Frontend Developer") — separate from `role`. Undefined until an Admin assigns one. */
  functionalRole?: FunctionalRole;
  /** Personal notification opt-in/out — only ever read back for the signed-in member's own record (Settings), never displayed for other members. */
  notificationPreferences?: Record<string, boolean>;
}

export interface Team {
  id: string;
  organizationId: string;
  name: string;
  description: string;
  /** null until an Admin assigns a Team Lead — never required to create a team. */
  leadUserId: string | null;
  memberIds: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
