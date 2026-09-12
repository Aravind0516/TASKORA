// Discussion comments on a project or a task — a single flat, org-scoped
// top-level collection, matching this repo's established pattern (tasks,
// subtasks, projects, teams, ... are never split into per-parent-type
// collections). A comment is either a project comment (taskId null) or a
// task comment (taskId set, projectId denormalized from that task) — never
// both, never neither. See firestore.rules for how that split is enforced
// server-side, not just assumed from the client.

export interface Comment {
  id: string;
  /** Multi-tenancy boundary — verified against the real parent (project or task) at write time, never trusted from the client alone. */
  organizationId: string;
  authorId: string;
  content: string;
  /** Set for both project and task comments (denormalized from the task for a task comment) — lets a project's full discussion surface be queried by projectId alone if ever needed. */
  projectId: string;
  /** null for a project-level comment; set for a comment on a specific task. */
  taskId: string | null;
  createdAt: string;
  updatedAt: string;
}
