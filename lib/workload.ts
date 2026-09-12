import { isOverdue } from "@/lib/format";

// One reusable, deterministic workload calculation — same philosophy as
// lib/project-health.ts: explainable counts derived from real task data
// already loaded by useWorkspace()/usePlatform() (no extra Firestore reads),
// never an opaque "productivity score" and never anything that tracks how a
// person actually works (keystrokes, time-in-app, etc.) — only what's
// already visible in the task board: how much is assigned, how much of it
// is stuck or late.

export type WorkloadLevel = "LOW" | "NORMAL" | "HIGH" | "OVERLOADED";

export interface WorkloadTaskInput {
  assignedTo: string;
  projectId: string;
  status: string;
  dueDate: string;
}

export interface MemberWorkload {
  memberId: string;
  level: WorkloadLevel;
  totalAssigned: number;
  pending: number;
  completed: number;
  blocked: number;
  overdue: number;
  activeProjects: number;
  completionPercent: number;
}

function classify(pending: number, blocked: number, overdue: number): WorkloadLevel {
  if (overdue >= 3 || blocked >= 3 || pending >= 10) return "OVERLOADED";
  if (overdue >= 1 || blocked >= 1 || pending >= 6) return "HIGH";
  if (pending === 0) return "LOW";
  return "NORMAL";
}

export function calculateMemberWorkload(memberId: string, allTasks: WorkloadTaskInput[]): MemberWorkload {
  const assigned = allTasks.filter((t) => t.assignedTo === memberId);
  const completed = assigned.filter((t) => t.status === "Completed").length;
  const pending = assigned.length - completed;
  const blocked = assigned.filter((t) => t.status === "Blocked").length;
  const overdue = assigned.filter((t) => t.status !== "Completed" && isOverdue(t.dueDate, false)).length;
  const activeProjects = new Set(assigned.filter((t) => t.status !== "Completed").map((t) => t.projectId)).size;
  const completionPercent = assigned.length > 0 ? Math.round((completed / assigned.length) * 100) : 0;

  return {
    memberId,
    level: classify(pending, blocked, overdue),
    totalAssigned: assigned.length,
    pending,
    completed,
    blocked,
    overdue,
    activeProjects,
    completionPercent,
  };
}
