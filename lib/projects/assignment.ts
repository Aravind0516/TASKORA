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

export const REPOSITORY_URL_REQUIRED_MESSAGE = "A repository URL is required when the project is assigned to an intern.";
export const REPOSITORY_URL_INVALID_MESSAGE = "Enter a full repository URL starting with http:// or https://.";

/**
 * Business rule: a project assigned to at least one intern (as a member or as
 * its manager) must carry a valid repository URL, because interns do their
 * work — and submit their evidence — against that repository. Projects with
 * no intern assigned keep the repository optional, but anything entered must
 * still be a valid http(s) URL. Returns an error message, or null when valid.
 */
export function repositoryUrlError(input: {
  repositoryUrl: string | null | undefined;
  assigneeIds: readonly string[];
  isIntern: (uid: string) => boolean;
}): string | null {
  const hasValue = Boolean(input.repositoryUrl?.trim());
  if (hasValue && !isValidRepositoryUrl(input.repositoryUrl)) return REPOSITORY_URL_INVALID_MESSAGE;
  if (!hasValue && input.assigneeIds.some(input.isIntern)) return REPOSITORY_URL_REQUIRED_MESSAGE;
  return null;
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
