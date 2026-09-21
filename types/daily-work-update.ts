// TASKORA Work Verification (Phase 1) — "Claimed work -> Evidence -> Review."
// A structured daily check-in, not surveillance: no screen/keystroke/webcam
// capture, no automatic activity tracking. An intern/employee submits what
// they did and (optionally) links to evidence; a manager reviews it. GitHub
// URLs are evidence context ONLY — never fetched, never used to count
// commits or compute a "productivity score." See lib/server/... — there is
// no server-side piece to this feature at all; every write goes through the
// client SDK under firestore.rules, exactly like tasks/comments/subtasks
// already do (no new privileged/Admin-SDK path was needed).

export type EvidenceType =
  | "GITHUB_REPOSITORY"
  | "GITHUB_COMMIT"
  | "GITHUB_PR"
  | "DEPLOYMENT"
  | "SCREENSHOT"
  | "DOCUMENT"
  | "OTHER_URL";

export interface WorkEvidence {
  type: EvidenceType;
  /** The link itself for a URL-based type (GITHUB_REPOSITORY, GITHUB_COMMIT, GITHUB_PR, DEPLOYMENT, OTHER_URL); empty for a file-based type (SCREENSHOT, DOCUMENT), which uses attachmentId/fileName below instead. */
  url: string;
  title: string;
  description: string;
  submittedAt: string;
  /**
   * SCREENSHOT/DOCUMENT only — references an attachments/{id} document
   * created via the existing secure upload flow (lib/services/
   * attachment.service.ts), never a public/persistent download URL. This is
   * deliberate: a Storage download URL, once generated, is effectively
   * public forever, which would bypass storage.rules/firestore.rules'
   * per-project authorization for anyone who later saw this update. Viewing
   * the file always re-fetches it through the authenticated SDK instead
   * (see downloadAttachmentBlob), exactly like the Attachments feature.
   */
  attachmentId?: string;
  /** Denormalized from the attachment for display without an extra read. */
  fileName?: string;
  /** Bytes — denormalized alongside fileName, same reason. */
  fileSize?: number;
}

/**
 * Deliberately does NOT include "REJECTED" — per the business requirement,
 * ordinary work verification never frames an intern's honest update as
 * rejected. NEEDS_CLARIFICATION is the correct state for "this isn't
 * verifiable yet," without implying wrongdoing.
 */
export type DailyUpdateStatus = "SUBMITTED" | "VERIFIED" | "PARTIALLY_VERIFIED" | "NEEDS_CLARIFICATION";

export interface DailyWorkUpdate {
  id: string;
  organizationId: string;
  projectId: string;
  /** null when the update is project-level rather than tied to one specific task. */
  taskId: string | null;
  /** The person who did the work and submitted this update — never reassignable. */
  userId: string;
  /** Calendar date this update is FOR, as "YYYY-MM-DD" (not a timestamp) — doubles as the deterministic id suffix (see lib/services/daily-work-update.service.ts), so there is exactly one update per user per project per day by construction, not by a query-time duplicate check. */
  date: string;
  workSummary: string;
  completedWork: string;
  blockers: string;
  tomorrowPlan: string;
  evidence: WorkEvidence[];
  status: DailyUpdateStatus;
  submittedAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  reviewerComment: string | null;
  createdAt: string;
  updatedAt: string;
}
