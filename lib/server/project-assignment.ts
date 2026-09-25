import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { ApiError } from "@/lib/server/api-response";
import { categoryForNotificationType } from "@/lib/notifications/categories";
import { projectAssigneeIds } from "@/lib/projects/assignment";
import type { UserRole } from "@/types/user";

// The ONLY path that creates project_assigned notifications (firestore.rules
// lets clients create only their own fan-out types, never this one). Mirrors
// lib/server/task-assignment.ts: everything is derived from the project
// document as persisted, never from the request body beyond WHICH people the
// caller says it just assigned — and each of those must actually be assigned
// right now, or they're skipped.
//
// Idempotency: the id is project_assigned_{projectId}_{uid}_v{version}, where
// version is projects/{id}.memberAssignmentVersions[uid] — bumped by the
// project write itself only when that person is newly assigned. A retry or
// double-submit resolves to the same id and create() rejects it; removing
// someone and assigning them again is a new version, so a new notification.

export function projectAssignmentNotificationId(projectId: string, uid: string, version: number): string {
  return `project_assigned_${projectId}_${uid}_v${version}`;
}

function isAlreadyExists(error: unknown): boolean {
  const code = typeof error === "object" && error !== null && "code" in error ? (error as { code: unknown }).code : null;
  return code === 6 || code === "already-exists" || code === "ALREADY_EXISTS";
}

export async function notifyProjectAssignment(
  projectId: string,
  recipientIds: string[],
  callerUid: string,
  callerRole: UserRole,
  callerOrgId: string | null
): Promise<{ created: string[] }> {
  const db = getAdminDb();
  const projectSnap = await db.collection("projects").doc(projectId).get();
  if (!projectSnap.exists) throw new ApiError(404, "Project not found.");
  const project = projectSnap.data()!;

  // Same authority as firestore.rules' projects update rule: Super Admin, the
  // organization's Admin, or this project's own manager.
  if (callerRole !== "super_admin") {
    if (!callerOrgId || project.organizationId !== callerOrgId) throw new ApiError(403, "You don't have permission to perform this action.");
    if (callerRole !== "admin" && project.managerId !== callerUid) throw new ApiError(403, "You don't have permission to perform this action.");
  }

  const assigned = new Set(projectAssigneeIds({ memberIds: (project.memberIds as string[]) ?? [], managerId: project.managerId ?? null }));
  const versions = (project.memberAssignmentVersions as Record<string, number> | undefined) ?? {};
  const category = categoryForNotificationType("project_assigned");
  const created: string[] = [];

  for (const uid of Array.from(new Set(recipientIds))) {
    if (uid === callerUid || !assigned.has(uid)) continue;
    const userSnap = await db.collection("users").doc(uid).get();
    const user = userSnap.data();
    // Never notify across organizations, even if a stale uid is on the project.
    if (!user || user.organizationId !== project.organizationId) continue;
    const prefs = user.notificationPreferences as Record<string, boolean> | undefined;
    if (category && prefs && prefs[category] === false) continue;

    const isManager = project.managerId === uid;
    const id = projectAssignmentNotificationId(projectId, uid, versions[uid] ?? 0);
    try {
      await db.collection("notifications").doc(id).create({
        userId: uid,
        organizationId: project.organizationId,
        actorId: callerUid,
        type: "project_assigned",
        title: isManager ? "You're managing a project" : "New project assigned",
        message: isManager ? `You were made the manager of "${project.name}".` : `You were added to the project "${project.name}".`,
        href: `/projects/${projectId}`,
        projectId,
        taskId: null,
        commentId: null,
        read: false,
        createdAt: FieldValue.serverTimestamp(),
      });
      created.push(id);
    } catch (error) {
      if (!isAlreadyExists(error)) throw error;
    }
  }
  return { created };
}
