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
    projectId: data.projectId ?? null,
    metadata: data.metadata ?? {},
    createdAt: toIso(data.createdAt),
    // Defaults true (routine/visible) for any pre-existing doc written
    // before this field existed — never silently hides old, non-sensitive
    // history from an Admin who already had full read access to it.
    visibleToMembers: data.visibleToMembers ?? true,
  };
}

/**
 * Admin/Super Admin only — enforced by firestore.rules. Unfiltered: includes
 * sensitive platform events (org/admin/invitation lifecycle) AND every
 * project's activity regardless of that project's membership — an org
 * admin's oversight is intentionally not project-scoped. A plain member
 * must use subscribeToProjectVisibleActivity/subscribeToOrgLevelVisibleActivity
 * instead — the activityLogs read rule can't grant a member this broader,
 * unfiltered query.
 */
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

/**
 * A plain member's view of ONE project's activity — the project/task
 * privacy model requires activity to inherit project authorization exactly
 * like tasks/comments/attachments/subtasks do. `projectId` must be pinned to
 * this single, specific project (not an "in" list of several projects) so
 * firestore.rules' isAuthorizedForProject(resource.data.projectId) — a
 * get()-based check — is something Firestore can actually verify from the
 * query alone; combining a get()-dependent rule with a multi-value "in"
 * filter is not a pattern this app relies on anywhere. A member with several
 * authorized projects gets one of these listeners per project (see
 * components/workspace/workspace-provider.tsx), merged client-side — more
 * listeners, but every one of them is provably safe.
 */
export function subscribeToProjectVisibleActivity(
  organizationId: string,
  projectId: string,
  onData: (entries: ActivityLogEntry[]) => void,
  onError: (message: string) => void
): () => void {
  const q = query(
    collection(db, "activityLogs"),
    where("organizationId", "==", organizationId),
    where("visibleToMembers", "==", true),
    where("projectId", "==", projectId),
    orderBy("createdAt", "desc"),
    limit(100)
  );
  return onSnapshot(
    q,
    (snapshot) => onData(snapshot.docs.map(activityFromDoc)),
    (error) => onError(getFirestoreErrorMessage(error, "activityLogs:project"))
  );
}

/**
 * A plain member's view of routine activity with no single owning project —
 * team lifecycle events, mainly. Never returns project-scoped events (those
 * come from subscribeToProjectVisibleActivity instead), so a private
 * project's activity can never leak in here regardless of the member's own
 * project authorizations.
 */
export function subscribeToOrgLevelVisibleActivity(
  organizationId: string,
  onData: (entries: ActivityLogEntry[]) => void,
  onError: (message: string) => void
): () => void {
  const q = query(
    collection(db, "activityLogs"),
    where("organizationId", "==", organizationId),
    where("visibleToMembers", "==", true),
    where("projectId", "==", null),
    orderBy("createdAt", "desc"),
    limit(100)
  );
  return onSnapshot(
    q,
    (snapshot) => onData(snapshot.docs.map(activityFromDoc)),
    (error) => onError(getFirestoreErrorMessage(error, "activityLogs:orgLevel"))
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
  /** null for an event with no single owning project (team/user/org lifecycle). */
  projectId: string | null;
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
    // Always true: firestore.rules' create rule already forbids a client
    // from writing a sensitive action at all, and separately requires this
    // field to match `!isSensitiveActivityAction(action)` — so this is the
    // only value a client write can ever legally send.
    await setDoc(ref, { ...input, metadata: {}, visibleToMembers: true, createdAt: serverTimestamp() });
  } catch (error) {
    console.error("Failed to log activity", error);
  }
}
