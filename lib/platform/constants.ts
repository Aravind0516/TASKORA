import type { PlatformPriority, PlatformRole, PlatformTaskStatus } from "@/types/platform";

export const PLATFORM_TASK_STATUSES: PlatformTaskStatus[] = ["Backlog", "To Do", "In Progress", "In Review", "Blocked", "Completed"];
export const PLATFORM_PRIORITIES: PlatformPriority[] = ["Low", "Medium", "High", "Critical"];

/** Human-readable role tagline shown next to the signed-in user's name across every shell and the login role cards. */
export const ROLE_DISPLAY_LABELS: Record<PlatformRole, string> = {
  super_admin: "Platform Owner",
  admin: "Organization Administrator",
  user: "Team Member",
};

/** Short, all-caps role name — paired with ROLE_DISPLAY_LABELS wherever both are shown (login role cards, account menu). */
export const ROLE_CAPS_LABEL: Record<PlatformRole, string> = {
  super_admin: "SUPER ADMIN",
  admin: "ADMIN",
  user: "USER",
};

/** Route each role lands on — shared by the demo quick-switcher and role-based redirects. */
export const ROLE_HOME_PATH: Record<PlatformRole, string> = {
  super_admin: "/superadmin",
  admin: "/admin",
  user: "/overview",
};
