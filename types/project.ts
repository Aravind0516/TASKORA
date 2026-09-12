export type ProjectStatus = "Planning" | "Active" | "On Hold" | "Completed";

export type ProjectPriority = "Low" | "Medium" | "High" | "Critical";

export interface Project {
  id: string;
  /** Multi-tenancy boundary — every query and security rule is scoped by this field, never by ownerId alone. */
  organizationId: string;
  teamId: string;
  name: string;
  description: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  progress: number;
  startDate: string;
  dueDate: string;
  ownerId: string;
  /** Project-scoped manager (PROJECT_MANAGER-equivalent) — a `user` granted elevated permissions on THIS project only. null until an Admin assigns one; never required to create a project. */
  managerId: string | null;
  memberIds: string[];
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}
