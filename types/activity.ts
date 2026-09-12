// Unified audit-log action vocabulary — merges the former single-tenant
// project/task events with the organization/team/invitation events from the
// platform (Admin/Super Admin) layer, now that both read the same
// `activityLogs` collection.
export type ActivityType =
  | "organization_created"
  | "organization_updated"
  | "organization_suspended"
  | "organization_activated"
  | "admin_registered"
  | "admin_suspended"
  | "user_invited"
  | "user_invitation_resent"
  | "user_invitation_cancelled"
  | "user_accepted_invitation"
  | "user_joined"
  | "user_added_to_team"
  | "user_removed_from_team"
  | "user_suspended"
  | "user_activated"
  | "team_created"
  | "team_updated"
  | "team_deleted"
  | "project_created"
  | "project_updated"
  | "project_completed"
  | "project_deleted"
  | "task_created"
  | "task_assigned"
  | "user_assigned"
  | "task_status_changed"
  | "task_completed"
  | "task_deleted";

export type ActivityEntityType = "organization" | "admin" | "user" | "team" | "project" | "task" | "invitation";

export interface ActivityLogEntry {
  id: string;
  organizationId: string;
  /** uid of the actor, or "system" for server-triggered events with no human actor. */
  actorId: string;
  actorName: string;
  action: ActivityType;
  entityType: ActivityEntityType;
  entityId: string;
  /** Human-readable label for the affected entity (project name, task title, ...) — kept denormalized so the activity feed never needs N+1 lookups. */
  entityName: string;
  metadata?: Record<string, string | number | boolean | null>;
  createdAt: string;
}
