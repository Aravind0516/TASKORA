export type TaskStatus =
  | "Backlog"
  | "To Do"
  | "In Progress"
  | "In Review"
  | "Blocked"
  | "Completed";

export type TaskPriority = "Low" | "Medium" | "High" | "Critical";

export interface Task {
  id: string;
  /** Multi-tenancy boundary — every query and security rule is scoped by this field. */
  organizationId: string;
  teamId: string;
  projectId: string;
  /** Creator of the task (not necessarily the assignee). */
  ownerId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignedTo: string;
  /** Reviews the completed work — a descriptive field only, never an authorization concept. Distinct from assignee/owner/manager; assigning a reviewer never changes who can update the task. null until an Admin/Manager sets one. */
  reviewerId?: string | null;
  /** Rough planning estimate, in hours. Optional — omitted entirely on tasks created before this field existed. */
  estimatedHours?: number | null;
  /** Actual/logged hours — a single running total, not a timer/timesheet. Optional, same compatibility note as estimatedHours. */
  actualHours?: number | null;
  /** Incremented only when assignedTo actually changes (0 = never assigned, or a task created before this field existed). The deterministic identity of a task-assignment notification — see lib/server/task-assignment.ts. */
  assignmentVersion: number;
  dueDate: string;
  labels: string[];
  createdAt: string;
  updatedAt: string;
}

export const TASK_STATUSES: TaskStatus[] = [
  "Backlog",
  "To Do",
  "In Progress",
  "In Review",
  "Blocked",
  "Completed",
];
