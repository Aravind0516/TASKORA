export type PerformerPeriod = "weekly" | "monthly";

/**
 * An organization's admin-published Top Performer for a week or month — the
 * recognition every member of that organization sees on their dashboard.
 * One document per organization per period type (`{organizationId}_weekly`,
 * `{organizationId}_monthly`), replaced each time the admin publishes, so the
 * latest recognition stays on display (labelled with the period it was for)
 * until the next one. Name/headline are snapshotted at publish time so every
 * member can render it without reading anyone's full profile.
 */
export interface TopPerformer {
  id: string;
  organizationId: string;
  period: PerformerPeriod;
  /** "YYYY-MM-DD" (week start) or "YYYY-MM" — see lib/credits/periods.ts. */
  periodKey: string;
  userId: string;
  displayName: string;
  /** Title or functional role shown under the name, e.g. "Frontend Intern". */
  headline: string | null;
  /** The admin's short recognition note — empty when none was written. */
  message: string;
  publishedBy: string;
  publishedByName: string;
  publishedAt: string;
}

/** A recognition note is a short banner line, not documentation. */
export const TOP_PERFORMER_MESSAGE_MAX = 280;
