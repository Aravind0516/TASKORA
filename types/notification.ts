export type NotificationType =
  | "task_assigned"
  | "task_status_changed"
  | "task_commented"
  | "project_commented"
  | "task_due_soon"
  | "task_completed"
  | "project_updated"
  | "meeting_created"
  | "meeting_updated"
  | "invitation_accepted"
  | "subscription_requested"
  | "subscription_approved"
  | "subscription_rejected"
  | "daily_update_submitted"
  | "daily_update_reviewed"
  | "credit_awarded"
  | "credit_deducted";

export interface AppNotification {
  id: string;
  /** Recipient. */
  userId: string;
  organizationId: string;
  /** Who triggered this notification — null for a system-generated event with no single human actor (e.g. a future scheduled due-date reminder). Verified server-side (firestore.rules requires actorId == the writer's own uid) so a notification can never misattribute its trigger to someone else. */
  actorId: string | null;
  type: NotificationType;
  title: string;
  message: string;
  href: string;
  /** Structured context for navigation/filtering, in addition to href — null when not applicable to this notification's type. */
  projectId: string | null;
  taskId: string | null;
  commentId: string | null;
  read: boolean;
  createdAt: string;
}
