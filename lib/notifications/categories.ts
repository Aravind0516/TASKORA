import type { NotificationType } from "@/types/notification";

// Single source of truth for user-facing notification preference categories —
// used both by the Settings page (rendering the toggle list) and by
// lib/services/notification.service.ts's notifyUsers() (deciding whether a
// given recipient actually wants a given notification type). Keeping this in
// one place is what "do not introduce duplicate preference systems" (PHASE F)
// actually means in code: one array, one id->category mapping, two readers.
//
// Ids "task-assigned", "due-date", "project-updates", "weekly-summary" predate
// this phase and must never change — they're already stored on real user
// documents (users/{uid}.notificationPreferences). "task-status-changed",
// "task-comments", "project-comments" are new in PHASE F; a user who has
// never touched Settings simply has no stored value for them, which
// notifyUsers() (and Settings' own defaultNotifPrefs() merge) treats as
// opted-in, matching this app's existing "unset = all defaults on" rule.
export interface NotificationCategory {
  id: string;
  title: string;
  description: string;
}

export const NOTIFICATION_CATEGORIES: NotificationCategory[] = [
  { id: "task-assigned", title: "Task assigned to me", description: "Get notified when a task is assigned to you." },
  { id: "project-assigned", title: "Project assigned to me", description: "Get notified when you are added to a project or made its manager." },
  { id: "task-status-changed", title: "Task status updates", description: "Get notified when a task you're involved in changes status." },
  { id: "task-comments", title: "Comments on my tasks", description: "Get notified when someone comments on a task you're involved in." },
  { id: "project-comments", title: "Comments on my projects", description: "Get notified when someone comments on a project you're involved in." },
  { id: "due-date", title: "Due date reminders", description: "Receive a reminder the day before a task is due." },
  { id: "project-updates", title: "Project updates", description: "Get notified when a project you're on changes status." },
  { id: "meetings", title: "Meeting invites & changes", description: "Get notified when you're added to a meeting or its time changes." },
  { id: "weekly-summary", title: "Weekly summary", description: "A weekly digest of activity across your projects." },
  { id: "work-verification", title: "Work Verification", description: "Daily update submissions and review results for projects you manage or work on." },
  { id: "credits", title: "Credit awards", description: "Get notified when your credits are awarded or adjusted." },
];

/**
 * null means "not user-gateable" — always created regardless of preferences
 * (invitation_accepted and the subscription_* events, all organizational/
 * admin-facing events — a Super Admin or Org Admin's own subscription
 * approval workflow, not a personal opt-in/out — matching invitation_accepted's
 * pre-PHASE-F precedent rather than adding a new preference toggle for
 * something only admins ever receive).
 */
export function categoryForNotificationType(type: NotificationType): string | null {
  switch (type) {
    case "task_assigned":
      return "task-assigned";
    case "project_assigned":
      return "project-assigned";
    case "task_status_changed":
    case "task_completed":
      return "task-status-changed";
    case "task_commented":
      return "task-comments";
    case "project_commented":
      return "project-comments";
    case "task_due_soon":
      return "due-date";
    case "project_updated":
      return "project-updates";
    case "meeting_created":
    case "meeting_updated":
      return "meetings";
    case "daily_update_submitted":
    case "daily_update_reviewed":
      return "work-verification";
    case "invitation_accepted":
    case "subscription_requested":
    case "subscription_approved":
    case "subscription_rejected":
    case "organization_registration_submitted":
    case "organization_registration_approved":
    case "organization_registration_rejected":
      return null;
    case "credit_awarded":
    case "credit_deducted":
      return "credits";
  }
}

export interface NotificationAlertBehavior {
  /** Show a pop-up when this arrives while the app is open. */
  popup: boolean;
  /** Also play the notification chime (see lib/notifications/sound.ts). */
  sound: boolean;
}

/**
 * How a NEW notification (one that arrives while TASKORA is open — never one
 * merely loaded from history) announces itself. Every type pops up; the chime
 * is reserved for events addressed to the recipient that ask for their
 * attention — work assigned to them, a meeting they're invited to or that
 * moved, a review of their work, a change to their credits — so routine
 * status and discussion traffic doesn't turn into constant noise.
 */
export function notificationAlertBehavior(type: NotificationType): NotificationAlertBehavior {
  switch (type) {
    case "task_assigned":
    case "project_assigned":
    case "meeting_created":
    case "meeting_updated":
    case "daily_update_reviewed":
    case "credit_awarded":
    case "credit_deducted":
      return { popup: true, sound: true };
    case "task_status_changed":
    case "task_completed":
    case "task_commented":
    case "project_commented":
    case "task_due_soon":
    case "project_updated":
    case "daily_update_submitted":
    case "invitation_accepted":
    case "subscription_requested":
    case "subscription_approved":
    case "subscription_rejected":
    case "organization_registration_submitted":
    case "organization_registration_approved":
    case "organization_registration_rejected":
      return { popup: true, sound: false };
  }
}
