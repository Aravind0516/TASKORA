import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { ApiError } from "@/lib/server/api-response";
import { categoryForNotificationType } from "@/lib/notifications/categories";
import type { UserRole } from "@/types/user";

// The ONLY path that ever creates a task_assigned notification (firestore.rules
// denies client creation of this type). Everything about the notification —
// recipient, version, wording — is derived from the task document as it is
// actually persisted, never from the request body, so a caller can neither
// notify someone the task isn't assigned to nor replay an old assignment.
//
// Idempotency: the document id is task_assigned_{taskId}_{assignee}_v{assignmentVersion}.
// assignmentVersion is bumped by the task write itself only when assignedTo
// actually changes (see workspace-provider/platform-provider updateTask), so:
//   - the same logical assignment always resolves to the same id — a double
//     submit, retry, or repeated call is rejected by create() as ALREADY_EXISTS;
//   - re-saving the same assignee never bumps the version, so never notifies;
//   - A -> B -> A bumps twice, so A's second assignment is a genuinely new event.

export function taskAssignmentNotificationId(taskId: string, assigneeId: string, assignmentVersion: number): string {
  return `task_assigned_${taskId}_${assigneeId}_v${assignmentVersion}`;
}

export type TaskAssignmentNotifyResult =
  | { created: true; notificationId: string }
  | { created: false; reason: "no_assignee" | "self_assigned" | "opted_out" | "already_notified" };

function isAlreadyExists(error: unknown): boolean {
  const code = typeof error === "object" && error !== null && "code" in error ? (error as { code: unknown }).code : null;
  return code === 6 || code === "already-exists" || code === "ALREADY_EXISTS";
}

export async function notifyTaskAssignment(
  taskId: string,
  callerUid: string,
  callerRole: UserRole,
  callerOrgId: string | null
): Promise<TaskAssignmentNotifyResult> {
  const db = getAdminDb();
  const taskSnap = await db.collection("tasks").doc(taskId).get();
  if (!taskSnap.exists) throw new ApiError(404, "Task not found.");
  const task = taskSnap.data()!;

  // Same authorization as firestore.rules' tasks update rule: Super Admin,
  // that organization's Admin, or the task's project's own assigned manager.
  if (callerRole !== "super_admin") {
    if (!callerOrgId || task.organizationId !== callerOrgId) throw new ApiError(403, "You don't have permission to perform this action.");
    if (callerRole !== "admin") {
      const projectSnap = await db.collection("projects").doc(String(task.projectId)).get();
      if (!projectSnap.exists || projectSnap.data()?.managerId !== callerUid) {
        throw new ApiError(403, "You don't have permission to perform this action.");
      }
    }
  }

  const assigneeId = typeof task.assignedTo === "string" ? task.assignedTo : "";
  if (!assigneeId) return { created: false, reason: "no_assignee" };
  if (assigneeId === callerUid) return { created: false, reason: "self_assigned" };

  const assigneeSnap = await db.collection("users").doc(assigneeId).get();
  const assignee = assigneeSnap.data();
  // Never notify across organizations, even if a stale uid is left on the task.
  if (!assignee || assignee.organizationId !== task.organizationId) return { created: false, reason: "no_assignee" };

  const category = categoryForNotificationType("task_assigned");
  const prefs = assignee.notificationPreferences as Record<string, boolean> | undefined;
  if (category && prefs && prefs[category] === false) return { created: false, reason: "opted_out" };

  const version = typeof task.assignmentVersion === "number" ? task.assignmentVersion : 0;
  const notificationId = taskAssignmentNotificationId(taskId, assigneeId, version);
  const assigneeIsPrivileged = assignee.role === "admin" || assignee.role === "super_admin";

  try {
    await db
      .collection("notifications")
      .doc(notificationId)
      .create({
        userId: assigneeId,
        organizationId: task.organizationId,
        actorId: callerUid,
        type: "task_assigned",
        title: "New task assigned",
        message: `You were assigned a new task: "${task.title}"`,
        href: assigneeIsPrivileged ? "/admin/tasks" : "/tasks",
        projectId: task.projectId ?? null,
        taskId,
        commentId: null,
        read: false,
        createdAt: FieldValue.serverTimestamp(),
      });
  } catch (error) {
    if (isAlreadyExists(error)) return { created: false, reason: "already_notified" };
    throw error;
  }
  return { created: true, notificationId };
}
