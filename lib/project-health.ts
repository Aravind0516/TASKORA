import { daysUntil } from "@/lib/format";

// Minimal, duck-typed shapes rather than importing Project/Task directly —
// this lets the SAME calculation run against both the individual shell's
// real Project/Task (types/project.ts, types/task.ts) and the admin
// console's display-mapped PlatformProject/PlatformTask (types/platform.ts)
// without either shell needing to convert its data first. Only the fields
// this calculation actually reads are required.
export interface HealthProjectInput {
  status: string;
  archived: boolean;
  progress: number;
  dueDate: string;
}
export interface HealthTaskInput {
  status: string;
  dueDate: string;
}

// PHASE F — one reusable, deterministic health calculation, called wherever
// a project's health needs to be shown (project list, project detail,
// dashboard, admin console). Never recomputed with different logic in
// different components — every caller passes the same Project + its own
// Task[] (already loaded by useWorkspace()/usePlatform() — no extra
// Firestore reads, no N+1 queries) into this one function.
//
// The thresholds below are deliberately explainable rather than a black-box
// score: each one maps to a plain-language reason that's surfaced in the UI,
// so "why is this At Risk?" always has a concrete answer built from the
// project's actual tasks and dates — never a mysterious composite number.

export type ProjectHealthStatus = "HEALTHY" | "AT_RISK" | "CRITICAL";

export interface ProjectHealth {
  status: ProjectHealthStatus;
  /** Short phrases describing exactly which signals produced this status, e.g. ["3 overdue tasks", "2 blocked tasks"] — empty for a clean Healthy project. */
  reasons: string[];
  /** One combined sentence for display: reasons + completion/deadline context (see the PHASE F spec's own example format). */
  summary: string;
  metrics: {
    totalTasks: number;
    completedTasks: number;
    overdueTasks: number;
    blockedTasks: number;
    completionPercent: number;
    /** Negative when the deadline has already passed. */
    daysRemaining: number;
  };
}

function isTaskOverdue(task: HealthTaskInput): boolean {
  return task.status !== "Completed" && daysUntil(task.dueDate) < 0;
}

export function calculateProjectHealth(project: HealthProjectInput, projectTasks: HealthTaskInput[]): ProjectHealth {
  const totalTasks = projectTasks.length;
  const completedTasks = projectTasks.filter((t) => t.status === "Completed").length;
  const overdueTasks = projectTasks.filter(isTaskOverdue).length;
  const blockedTasks = projectTasks.filter((t) => t.status === "Blocked").length;
  const completionPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : project.progress;
  const daysRemaining = daysUntil(project.dueDate);

  const metrics = { totalTasks, completedTasks, overdueTasks, blockedTasks, completionPercent, daysRemaining };
  const deadlineClause =
    daysRemaining >= 0
      ? `${daysRemaining} day${daysRemaining === 1 ? "" : "s"} remaining`
      : `${Math.abs(daysRemaining)} day${Math.abs(daysRemaining) === 1 ? "" : "s"} overdue`;
  const contextSentence = `Project is ${completionPercent}% complete with ${deadlineClause}.`;

  // A finished or shelved project isn't "at risk" of anything anymore —
  // health is about ongoing operational risk, not a permanent record.
  if (project.status === "Completed" || project.archived) {
    const reason = project.archived ? "Project is archived" : "Project is complete";
    return { status: "HEALTHY", reasons: [reason], summary: `${reason}.`, metrics };
  }

  const isPastDue = daysRemaining < 0;
  const deadlineImminent = daysRemaining >= 0 && daysRemaining <= 2;
  const deadlineApproaching = daysRemaining >= 0 && daysRemaining <= 7;

  const criticalReasons: string[] = [];
  if (isPastDue && completionPercent < 100) {
    criticalReasons.push(`Deadline passed ${Math.abs(daysRemaining)} day${Math.abs(daysRemaining) === 1 ? "" : "s"} ago`);
  }
  if (overdueTasks >= 3) criticalReasons.push(`${overdueTasks} overdue tasks`);
  if (blockedTasks >= 2) criticalReasons.push(`${blockedTasks} blocked tasks`);
  if (deadlineImminent && completionPercent < 70) criticalReasons.push(`deadline in ${daysRemaining} day${daysRemaining === 1 ? "" : "s"} with substantial work remaining`);

  if (criticalReasons.length > 0) {
    return { status: "CRITICAL", reasons: criticalReasons, summary: `${criticalReasons.join(" and ")}. ${contextSentence}`, metrics };
  }

  const atRiskReasons: string[] = [];
  if (overdueTasks >= 1) atRiskReasons.push(`${overdueTasks} overdue task${overdueTasks === 1 ? "" : "s"}`);
  if (blockedTasks >= 1) atRiskReasons.push(`${blockedTasks} blocked task${blockedTasks === 1 ? "" : "s"}`);
  if (deadlineApproaching && completionPercent < 60) atRiskReasons.push(`deadline in ${daysRemaining} day${daysRemaining === 1 ? "" : "s"} with less than 60% complete`);

  if (atRiskReasons.length > 0) {
    return { status: "AT_RISK", reasons: atRiskReasons, summary: `${atRiskReasons.join(" and ")}. ${contextSentence}`, metrics };
  }

  return { status: "HEALTHY", reasons: [], summary: `On track. ${contextSentence}`, metrics };
}
