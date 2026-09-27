// Shared project-assignment rules — used by both client shells (workspace /
// platform providers and their project forms) and the server route that
// creates project-assignment notifications, so "who is assigned", "what is a
// valid repository URL" and "when is one required" can never disagree
// between layers.

/** Everyone a project is assigned to: its members plus its manager. */
export function projectAssigneeIds(project: { memberIds: readonly string[]; managerId?: string | null }): string[] {
  return Array.from(new Set([...project.memberIds, ...(project.managerId ? [project.managerId] : [])]));
}

/** Assignees present in `after` but not in `before` — the people a save newly assigned. */
export function newlyAssignedIds(before: readonly string[], after: readonly string[]): string[] {
  const previous = new Set(before);
  return after.filter((id) => !previous.has(id));
}

/**
 * A usable repository link: an absolute http(s) URL with a host. No length
 * cap — a repository URL is whatever the hosting provider says it is.
 */
export function isValidRepositoryUrl(value: string | null | undefined): boolean {
  const trimmed = value?.trim();
  if (!trimmed || /\s/.test(trimmed)) return false;
  try {
    const url = new URL(trimmed);
    return (url.protocol === "http:" || url.protocol === "https:") && url.hostname.length > 0;
  } catch {
    return false;
  }
}

export const REPOSITORY_URL_REQUIRED_MESSAGE = "A repository URL is required.";
export const REPOSITORY_URL_INVALID_MESSAGE = "Enter a full repository URL starting with http:// or https://.";
export const REQUIREMENTS_REQUIRED_MESSAGE = "Project requirements are required.";

/**
 * Every TASKORA project carries a repository link and written requirements:
 * the people assigned to it — interns especially — build against that
 * repository and work from those requirements, and daily updates are
 * verified against both. Returns an error message, or null when valid.
 */
export function repositoryUrlError(repositoryUrl: string | null | undefined): string | null {
  if (!repositoryUrl?.trim()) return REPOSITORY_URL_REQUIRED_MESSAGE;
  return isValidRepositoryUrl(repositoryUrl) ? null : REPOSITORY_URL_INVALID_MESSAGE;
}

/** Whitespace-only counts as empty. No length cap — detailed requirements are legitimate project documentation. */
export function requirementsError(requirements: string | null | undefined): string | null {
  return requirements?.trim() ? null : REQUIREMENTS_REQUIRED_MESSAGE;
}

/** The two workflow-required project fields, checked together — the provider write paths call this before every save that sets them. */
export function projectBriefError(project: { repositoryUrl?: string | null; requirements?: string | null }): string | null {
  return requirementsError(project.requirements) ?? repositoryUrlError(project.repositoryUrl);
}

/**
 * The next per-assignee assignment versions after a save: each newly assigned
 * person's counter goes up by one, everyone else's is unchanged. The version
 * is the deterministic identity of that person's project-assignment
 * notification (see lib/server/project-assignment.ts) — so removing someone
 * and assigning them again is a genuinely new event, while re-saving the same
 * membership never is.
 */
export function bumpAssignmentVersions(previous: Readonly<Record<string, number>> | undefined, newlyAssigned: readonly string[]): Record<string, number> {
  const next: Record<string, number> = { ...(previous ?? {}) };
  for (const uid of newlyAssigned) next[uid] = (next[uid] ?? 0) + 1;
  return next;
}
