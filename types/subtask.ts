// Lightweight checklist items under a task — a separate top-level Firestore
// collection (not an embedded array on the task doc), matching this repo's
// existing pattern of flat, organizationId-scoped collections for every
// one-to-many relationship (projects, tasks, teams, ...) rather than
// growing arrays on a parent document. No dependency engine, no nested
// subtasks-of-subtasks — a subtask always references exactly one task.

export interface Subtask {
  id: string;
  /**
   * Denormalized from the parent task at creation time — needed so
   * firestore.rules can scope reads without a get() on every single read
   * (writes still verify this against the live parent task; see
   * firestore.rules' taskOrgId()). A task's organizationId never changes
   * after creation, so this can't go stale.
   */
  organizationId: string;
  /** The parent task this subtask belongs to — never reassignable to a different task after creation (see firestore.rules). */
  taskId: string;
  /**
   * Denormalized from the parent task at creation time, same rationale as
   * organizationId above — lets firestore.rules check project-level
   * authorization (a subtask is only visible to someone authorized for its
   * project) via a single get() on the project, without first reading the
   * parent task.
   */
  projectId: string;
  title: string;
  completed: boolean;
  /** Optional — who's doing this specific checklist item. null = unassigned. */
  assigneeId: string | null;
  /** Display order within the parent task's list — a plain insertion index, not a reorder/drag-drop feature. */
  order: number;
  createdAt: string;
  updatedAt: string;
}
