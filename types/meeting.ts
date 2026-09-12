// Internal meeting coordination — NOT a video-conferencing product. A
// meeting optionally carries a plain URL field (Zoom/Meet/Teams link the
// organizer pastes in) rather than any real-time conferencing integration,
// which would require paid third-party infrastructure this fast-track pass
// deliberately defers. A single flat, org-scoped top-level collection,
// matching this repo's established pattern (comments, subtasks, attachments,
// ...) rather than per-project sub-collections.

export type MeetingStatus = "Scheduled" | "Completed" | "Cancelled";

export interface Meeting {
  id: string;
  /** Multi-tenancy boundary. */
  organizationId: string;
  title: string;
  description: string;
  /** Optional — a meeting isn't required to belong to a specific project. */
  projectId: string | null;
  organizerId: string;
  participantIds: string[];
  /** ISO datetime. */
  startAt: string;
  /** ISO datetime — must be after startAt (enforced client-side via Zod; not a security boundary). */
  endAt: string;
  status: MeetingStatus;
  notes: string;
  /** Optional external video-call URL (Zoom/Meet/Teams/...) — plain text, never validated against a specific provider. */
  meetingLink: string | null;
  createdAt: string;
  updatedAt: string;
}
