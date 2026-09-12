// File attachments on a project or a task — metadata only, mirroring the
// comments/subtasks pattern (a single flat, org-scoped top-level collection
// rather than per-parent-type collections). The binary file itself lives in
// Firebase Storage at `storagePath`; this document only describes it. An
// attachment is either a project attachment (taskId null) or a task
// attachment (taskId set, projectId denormalized from that task) — never
// both, never neither. See firestore.rules and storage.rules for how both
// systems enforce the same organization/project/task boundaries.

export interface Attachment {
  id: string;
  /** Multi-tenancy boundary — verified against the real parent (project or task) at write time, never trusted from the client alone. */
  organizationId: string;
  /** Set for both project and task attachments (denormalized from the task for a task attachment). */
  projectId: string;
  /** null for a project-level attachment; set for an attachment on a specific task. */
  taskId: string | null;
  /** Original filename as the user selected it — display only, never used to build storagePath. */
  fileName: string;
  /** Storage object path: organizations/{organizationId}/projects/{projectId}/attachments/{id} or .../tasks/{taskId}/attachments/{id} — {id} is this document's own id, never the filename. */
  storagePath: string;
  contentType: string;
  /** Bytes. */
  size: number;
  uploadedBy: string;
  createdAt: string;
}
