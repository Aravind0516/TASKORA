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
  { id: "task-status-changed", title: "Task status updates", description: "Get notified when a task you're involved in changes status." },
  { id: "task-comments", title: "Comments on my tasks", description: "Get notified when someone comments on a task you're involved in." },
  { id: "project-comments", title: "Comments on my projects", description: "Get notified when someone comments on a project you're involved in." },
  { id: "due-date", title: "Due date reminders", description: "Receive a reminder the day before a task is due." },
  { id: "project-updates", title: "Project updates", description: "Get notified when a project you're on changes status." },
  { id: "meetings", title: "Meeting invites & changes", description: "Get notified when you're added to a meeting or its time changes." },
  { id: "weekly-summary", title: "Weekly summary", description: "A weekly digest of activity across your projects." },
];

/**
 * null means "not user-gateable" — always created regardless of preferences
 * (currently just invitation_accepted, an organizational/admin-facing event
 * rather than a personal opt-in/out, matching its pre-PHASE-F behavior).
 */
export function categoryForNotificationType(type: NotificationType): string | null {
  switch (type) {
    case "task_assigned":
      return "task-assigned";
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
    case "invitation_accepted":
      return null;
  }
}
