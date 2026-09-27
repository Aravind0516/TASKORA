import type { PlatformRole } from "@/types/platform";

// TASKORA has separate application shells: the member workspace (app/(app)/*,
// with the personal sidebar — My Profile, My Credits, My Performance, ...),
// the organization-admin console (app/admin/*) and the platform console
// (app/superadmin/*). Several links are written as member-workspace paths —
// stored notification links ("/projects/abc", "/tasks", "/meetings"), search
// results, links inside views both shells share — so every path an
// Organization Admin can reach is translated here to its admin-console
// equivalent. Used by ProtectedRoute (so no deep link, refresh, back/forward
// or old notification can put an admin in the member shell) and by shared
// links (so they point at the right shell in the first place).

const ADMIN_EQUIVALENTS: Record<string, string> = {
  "/overview": "/admin",
  "/projects": "/admin/projects",
  "/tasks": "/admin/tasks",
  "/kanban": "/admin/tasks",
  "/team": "/admin/teams",
  "/meetings": "/admin/meetings",
  "/calendar": "/admin/calendar",
  "/leaderboard": "/admin/leaderboard",
  "/credits": "/admin/credits",
  "/performance": "/admin/analytics",
  "/analytics": "/admin/analytics",
  "/profile": "/admin/account",
  "/settings": "/admin/settings",
};

/** The admin-console path for a member-workspace path, keeping any query string — or null if the path isn't a member-workspace route. */
export function adminShellPath(path: string): string | null {
  const queryIndex = path.search(/[?#]/);
  const pathname = (queryIndex === -1 ? path : path.slice(0, queryIndex)).replace(/\/+$/, "") || "/";
  const suffix = queryIndex === -1 ? "" : path.slice(queryIndex);
  if (/^\/projects\/[^/]+$/.test(pathname)) return `/admin${pathname}${suffix}`;
  const mapped = ADMIN_EQUIVALENTS[pathname];
  return mapped ? `${mapped}${suffix}` : null;
}

/** Where a link written as a member-workspace path should go for this role. Members get it unchanged. */
export function shellPath(path: string, role: PlatformRole | null): string {
  if (role === "admin") return adminShellPath(path) ?? path;
  return path;
}
