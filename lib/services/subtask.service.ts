import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { getFirestoreErrorMessage } from "@/lib/firebase/firestore-errors";
import { toIso } from "@/lib/firebase/timestamp";
import type { Subtask } from "@/types/subtask";

function subtaskFromDoc(docSnap: QueryDocumentSnapshot): Subtask {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    organizationId: data.organizationId,
    taskId: data.taskId,
    projectId: data.projectId,
    title: data.title,
    completed: Boolean(data.completed),
    assigneeId: data.assigneeId ?? null,
    order: data.order ?? 0,
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
  };
}

/**
 * Scoped to one task, not the whole organization — deliberately not a
 * global always-on listener like tasks/projects, since subtasks are only
 * ever needed while a specific task's edit dialog is open (see
 * components/tasks/subtask-checklist.tsx). Avoids an unnecessary realtime
 * listener per this repo's performance principles.
 *
 * organizationId AND projectId are both explicit query filters for the same
 * reason comment.service.ts/attachment.service.ts already document:
 * firestore.rules' read rule depends on resource.data.organizationId (admin
 * branch) or resource.data.projectId (isAuthorizedForProject — the plain-
 * member AND project-manager branch), and Firestore can only verify a list
 * query's rule from the query's OWN filters. A query missing either field
 * left this genuinely broken in production for EVERY caller, including a
 * project's own manager and Org Admin, not just a plain employee — verified
 * live against the deployed rules before this fix.
 */
export function subscribeToSubtasks(
  organizationId: string,
  projectId: string,
  taskId: string,
  onData: (subtasks: Subtask[]) => void,
  onError: (message: string) => void
): () => void {
  const q = query(
    collection(db, "subtasks"),
    where("organizationId", "==", organizationId),
    where("projectId", "==", projectId),
    where("taskId", "==", taskId),
    orderBy("order", "asc")
  );
  return onSnapshot(
    q,
    (snapshot) => onData(snapshot.docs.map(subtaskFromDoc)),
    (error) => onError(getFirestoreErrorMessage(error, "subtasks"))
  );
}

/**
 * Subtask completion for several tasks in ONE project at once (e.g. a "My
 * Tasks" list) — one query instead of one listener per task. `projectId` is
 * pinned to a single, known project (every caller only ever passes tasks
 * from one project page) so firestore.rules' isAuthorizedForProject() — a
 * get()-based check — is provable from this query; the `taskId in [...]`
 * filter only narrows further within that already-authorized project, it
 * never substitutes for the project check. Firestore's `in` operator caps
 * at 30 values.
 */
export function subscribeToSubtasksByTaskIds(
  organizationId: string,
  projectId: string,
  taskIds: string[],
  onData: (subtasks: Subtask[]) => void,
  onError: (message: string) => void
): () => void {
  if (taskIds.length === 0 || taskIds.length > 30) {
    onData([]);
    return () => {};
  }
  const q = query(
    collection(db, "subtasks"),
    where("organizationId", "==", organizationId),
    where("projectId", "==", projectId),
    where("taskId", "in", taskIds)
  );
  return onSnapshot(
    q,
    (snapshot) => onData(snapshot.docs.map(subtaskFromDoc)),
    (error) => onError(getFirestoreErrorMessage(error, "subtasks:byTaskIds"))
  );
}

export interface SubtaskInput {
  organizationId: string;
  taskId: string;
  projectId: string;
  title: string;
  assigneeId?: string | null;
  order: number;
}

export async function createSubtask(input: SubtaskInput): Promise<string> {
  try {
    const ref = doc(collection(db, "subtasks"));
    const now = serverTimestamp();
    await setDoc(ref, {
      organizationId: input.organizationId,
      taskId: input.taskId,
      projectId: input.projectId,
      title: input.title,
      completed: false,
      assigneeId: input.assigneeId ?? null,
      order: input.order,
      createdAt: now,
      updatedAt: now,
    });
    return ref.id;
  } catch (error) {
    throw new Error(getFirestoreErrorMessage(error, "subtasks:create"));
  }
}

export async function toggleSubtaskCompleted(subtaskId: string, completed: boolean): Promise<void> {
  try {
    await updateDoc(doc(db, "subtasks", subtaskId), { completed, updatedAt: serverTimestamp() });
  } catch (error) {
    throw new Error(getFirestoreErrorMessage(error, "subtasks:toggle"));
  }
}

export async function updateSubtask(subtaskId: string, patch: { title?: string; assigneeId?: string | null }): Promise<void> {
  try {
    await updateDoc(doc(db, "subtasks", subtaskId), { ...patch, updatedAt: serverTimestamp() });
  } catch (error) {
    throw new Error(getFirestoreErrorMessage(error, "subtasks:update"));
  }
}

export async function deleteSubtask(subtaskId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "subtasks", subtaskId));
  } catch (error) {
    throw new Error(getFirestoreErrorMessage(error, "subtasks:delete"));
  }
}
