import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import type { NotificationType } from "@/types/notification";

interface WriteNotificationInput {
  userId: string;
  organizationId: string;
  actorId: string | null;
  type: NotificationType;
  title: string;
  message: string;
  href: string;
}

/**
 * Server-controlled notification writer — mirrors lib/services/notification.service.ts's
 * createNotification() exactly (same document shape), but via the Admin SDK
 * for Route Handlers that don't have a signed-in client SDK context to write
 * through (subscription request creation/approval/rejection all happen
 * server-side — see lib/server/subscriptions.ts). Reuses the SAME
 * `notifications` collection and document shape rather than inventing a
 * parallel one, per "integrate into the existing notification system."
 */
export async function writeNotification(input: WriteNotificationInput): Promise<void> {
  try {
    await getAdminDb().collection("notifications").add({
      userId: input.userId,
      organizationId: input.organizationId,
      actorId: input.actorId,
      type: input.type,
      title: input.title,
      message: input.message,
      href: input.href,
      projectId: null,
      taskId: null,
      commentId: null,
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    // Never let a notification failure fail the primary operation (request
    // creation / approval / rejection) — same philosophy as lib/server/activity.ts.
    console.error(`[notifications] failed to notify ${input.userId} for "${input.type}"`, error);
  }
}

/** Notifies every Super Admin on the platform — used when an org submits a new subscription request. Platform-wide by design (Super Admin isn't scoped to one organization), so this queries by role rather than organizationId. */
export async function notifySuperAdmins(input: Omit<WriteNotificationInput, "userId" | "organizationId"> & { organizationId: string }): Promise<void> {
  const snap = await getAdminDb().collection("users").where("role", "==", "super_admin").get();
  await Promise.all(snap.docs.map((doc) => writeNotification({ ...input, userId: doc.id })));
}

/** Notifies every admin of one organization — used when a Super Admin approves/rejects that org's subscription request. */
export async function notifyOrgAdmins(organizationId: string, adminIds: string[], input: Omit<WriteNotificationInput, "userId" | "organizationId">): Promise<void> {
  await Promise.all(adminIds.map((userId) => writeNotification({ ...input, userId, organizationId })));
}
