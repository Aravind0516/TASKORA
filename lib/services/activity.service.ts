import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { getFirestoreErrorMessage } from "@/lib/firebase/firestore-errors";
import { toIso } from "@/lib/firebase/timestamp";
import type { ActivityEntityType, ActivityLogEntry, ActivityType } from "@/types/activity";

function activityFromDoc(docSnap: QueryDocumentSnapshot): ActivityLogEntry {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    organizationId: data.organizationId,
    actorId: data.actorId,
    actorName: data.actorName,
    action: data.action as ActivityType,
    entityType: data.entityType as ActivityEntityType,
    entityId: data.entityId,
    entityName: data.entityName,
    metadata: data.metadata ?? {},
    createdAt: toIso(data.createdAt),
  };
}

/** Admin/Super Admin only — enforced by firestore.rules. */
export function subscribeToActivity(
  organizationId: string,
  onData: (entries: ActivityLogEntry[]) => void,
  onError: (message: string) => void
): () => void {
  const q = query(collection(db, "activityLogs"), where("organizationId", "==", organizationId), orderBy("createdAt", "desc"), limit(100));
  return onSnapshot(
    q,
    (snapshot) => onData(snapshot.docs.map(activityFromDoc)),
    (error) => onError(getFirestoreErrorMessage(error, "activityLogs"))
  );
}

/** Super Admin only — enforced by firestore.rules. */
export function subscribeToAllActivity(onData: (entries: ActivityLogEntry[]) => void, onError: (message: string) => void): () => void {
  return onSnapshot(
    query(collection(db, "activityLogs"), orderBy("createdAt", "desc"), limit(100)),
    (snapshot) => onData(snapshot.docs.map(activityFromDoc)),
    (error) => onError(getFirestoreErrorMessage(error, "activityLogs:all"))
  );
}

export interface LogActivityInput {
  organizationId: string;
  actorId: string;
  actorName: string;
  action: ActivityType;
  entityType: ActivityEntityType;
  entityId: string;
  entityName: string;
}

/**
 * Client-side writer for routine CRUD activity (project/task/team events) —
 * firestore.rules only allows this for non-sensitive action types and only
 * when actorId matches the caller. Organization/admin/invitation lifecycle
 * events are written server-side instead (lib/server/activity.ts).
 */
export async function logActivity(input: LogActivityInput): Promise<void> {
  try {
    const ref = doc(collection(db, "activityLogs"));
    await setDoc(ref, { ...input, metadata: {}, createdAt: serverTimestamp() });
  } catch (error) {
    console.error("Failed to log activity", error);
  }
}
