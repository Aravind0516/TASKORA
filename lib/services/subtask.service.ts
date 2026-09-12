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
 */
export function subscribeToSubtasks(
  taskId: string,
  onData: (subtasks: Subtask[]) => void,
  onError: (message: string) => void
): () => void {
  const q = query(collection(db, "subtasks"), where("taskId", "==", taskId), orderBy("order", "asc"));
  return onSnapshot(
    q,
    (snapshot) => onData(snapshot.docs.map(subtaskFromDoc)),
    (error) => onError(getFirestoreErrorMessage(error, "subtasks"))
  );
}

export interface SubtaskInput {
  organizationId: string;
  taskId: string;
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
