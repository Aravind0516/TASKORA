import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { getFirestoreErrorMessage } from "@/lib/firebase/firestore-errors";
import { toIso } from "@/lib/firebase/timestamp";
import { categoryForNotificationType } from "@/lib/notifications/categories";
import type { AppNotification, NotificationType } from "@/types/notification";

export type { AppNotification };

function notificationFromDoc(docSnap: QueryDocumentSnapshot): AppNotification {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    userId: data.userId,
    organizationId: data.organizationId ?? "",
    actorId: data.actorId ?? null,
    title: data.title,
    message: data.message,
    type: data.type,
    href: data.href ?? "/overview",
    projectId: data.projectId ?? null,
    taskId: data.taskId ?? null,
    commentId: data.commentId ?? null,
    read: Boolean(data.read),
    createdAt: toIso(data.createdAt),
  };
}

export function subscribeToNotifications(
  uid: string,
  onData: (notifications: AppNotification[]) => void,
  onError: (message: string) => void
): () => void {
  const q = query(collection(db, "notifications"), where("userId", "==", uid), orderBy("createdAt", "desc"), limit(50));
  return onSnapshot(
    q,
    (snapshot) => onData(snapshot.docs.map(notificationFromDoc)),
    (error) => onError(getFirestoreErrorMessage(error, "notifications"))
  );
}

export interface CreateNotificationInput {
  type: NotificationType;
  title: string;
  message: string;
  href?: string;
  /** Who triggered this — null only for a system-generated event with no single human actor. firestore.rules requires this to equal the caller's own uid whenever it's set, so it can never misattribute a notification to someone else. */
  actorId: string | null;
  projectId?: string | null;
  taskId?: string | null;
  commentId?: string | null;
}

export async function createNotification(userId: string, organizationId: string, input: CreateNotificationInput): Promise<void> {
  try {
    const ref = doc(collection(db, "notifications"));
    await setDoc(ref, {
      userId,
      organizationId,
      actorId: input.actorId,
      title: input.title,
      message: input.message,
      type: input.type,
      href: input.href ?? "/overview",
      projectId: input.projectId ?? null,
      taskId: input.taskId ?? null,
      commentId: input.commentId ?? null,
      read: false,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    throw new Error(getFirestoreErrorMessage(error, "notifications:create"));
  }
}

export interface NotifyUsersInput {
  organizationId: string;
  /** The uid performing the action — never notified even if included in recipientIds (self-notification is never meaningful for the event types this fans out; see PHASE F). */
  actorId: string;
  /** Candidate recipients — deduplicated and self-excluded internally, so callers can pass a raw list like [assignee, owner, manager] without pre-filtering. */
  recipientIds: Array<string | null | undefined>;
  type: NotificationType;
  title: string;
  message: string;
  href: string;
  projectId?: string | null;
  taskId?: string | null;
  commentId?: string | null;
  /**
   * Looks up a candidate recipient's stored notification preferences —
   * intended to be backed by an already-loaded roster (useWorkspace()'s
   * members / usePlatform()'s users), never a fresh Firestore read per
   * recipient. A recipient with no entry, or no value for this
   * notification's category, is treated as opted-in — matching this app's
   * existing "unset = all defaults on" rule (see components/settings/
   * settings-view.tsx's defaultNotifPrefs()).
   */
  getPreferences?: (uid: string) => Record<string, boolean> | undefined;
}

/**
 * The single fan-out path for every multi-recipient notification in this
 * app (PHASE F: task assigned, task/project status changes, task/project
 * comments) — centralizing dedup, self-exclusion, and preference-gating here
 * once, rather than re-implementing them at every call site, is what keeps
 * "no duplicated notification logic" true in practice. Each recipient is
 * written independently (Promise.allSettled semantics via the inner
 * try/catch) so one recipient's write failing — e.g. a stale uid — never
 * blocks notifying the others, and never blocks the caller's own primary
 * action (task creation, comment posting, ...), which has already succeeded
 * by the time this runs.
 */
export async function notifyUsers(input: NotifyUsersInput): Promise<void> {
  const category = categoryForNotificationType(input.type);
  const uniqueRecipientIds = Array.from(
    new Set(input.recipientIds.filter((id): id is string => Boolean(id) && id !== input.actorId))
  );

  await Promise.all(
    uniqueRecipientIds.map(async (recipientId) => {
      if (category) {
        const prefs = input.getPreferences?.(recipientId);
        if (prefs && prefs[category] === false) return;
      }
      try {
        await createNotification(recipientId, input.organizationId, {
          type: input.type,
          title: input.title,
          message: input.message,
          href: input.href,
          actorId: input.actorId,
          projectId: input.projectId,
          taskId: input.taskId,
          commentId: input.commentId,
        });
      } catch (error) {
        console.error(`notifyUsers: failed to notify ${recipientId} for "${input.type}"`, error);
      }
    })
  );
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  try {
    await updateDoc(doc(db, "notifications", notificationId), { read: true });
  } catch (error) {
    throw new Error(getFirestoreErrorMessage(error, "notifications:markRead"));
  }
}

export async function markAllNotificationsRead(notificationIds: string[]): Promise<void> {
  try {
    const batch = writeBatch(db);
    for (const id of notificationIds) {
      batch.update(doc(db, "notifications", id), { read: true });
    }
    await batch.commit();
  } catch (error) {
    throw new Error(getFirestoreErrorMessage(error, "notifications:markAllRead"));
  }
}
