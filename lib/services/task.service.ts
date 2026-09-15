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
import type { Task, TaskPriority, TaskStatus } from "@/types/task";

function taskFromDoc(docSnap: QueryDocumentSnapshot): Task {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    organizationId: data.organizationId,
    teamId: data.teamId,
    projectId: data.projectId,
    ownerId: data.ownerId,
    title: data.title,
    description: data.description,
    status: data.status,
    priority: data.priority,
    assignedTo: data.assignedTo,
    reviewerId: data.reviewerId ?? null,
    estimatedHours: data.estimatedHours ?? null,
    actualHours: data.actualHours ?? null,
    dueDate: data.dueDate,
    labels: data.labels ?? [],
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
  };
}

/**
 * Fetches every task in the organization once, real-time. My Tasks/Kanban/
 * Admin Tasks all derive their specific view from this same subscription
 * client-side (see useWorkspace()'s getters) — per-org task volume is small
 * enough that one listener is simpler and cheaper than several narrower
 * ones, and avoids extra composite indexes.
 */
export function subscribeToTasks(
  organizationId: string,
  onData: (tasks: Task[]) => void,
  onError: (message: string) => void
): () => void {
  const q = query(collection(db, "tasks"), where("organizationId", "==", organizationId), orderBy("updatedAt", "desc"));
  return onSnapshot(
    q,
    (snapshot) => onData(snapshot.docs.map(taskFromDoc)),
    (error) => onError(getFirestoreErrorMessage(error, "tasks"))
  );
}

/** Super Admin only — enforced by firestore.rules. */
export function subscribeToAllTasks(onData: (tasks: Task[]) => void, onError: (message: string) => void): () => void {
  return onSnapshot(
    query(collection(db, "tasks"), orderBy("updatedAt", "desc")),
    (snapshot) => onData(snapshot.docs.map(taskFromDoc)),
    (error) => onError(getFirestoreErrorMessage(error, "tasks:all"))
  );
}

/**
 * A plain member's tasks, scoped to a known set of projects they're already
 * authorized for (see project.service.ts's subscribeToMyProjects) — one
 * listener per project rather than a single `projectId in [...]` query.
 * firestore.rules' non-admin read branch checks isAuthorizedForProject(),
 * a get()-based condition; combining that with a multi-value "in" filter
 * isn't a pattern this app relies on anywhere; a plain `projectId == X`
 * equality filter is the same, already-proven shape dailyWorkUpdates' own
 * project-scoped read uses. Re-subscribes only when the actual set of
 * project ids changes (see workspace-provider.tsx's caller).
 */
export function subscribeToTasksForProjects(
  organizationId: string,
  projectIds: string[],
  onData: (tasks: Task[]) => void,
  onError: (message: string) => void
): () => void {
  if (projectIds.length === 0) {
    onData([]);
    return () => {};
  }
  const resultsByProject = new Map<string, Task[]>();
  function emit() {
    onData(Array.from(resultsByProject.values()).flat());
  }
  const unsubscribers = projectIds.map((projectId) => {
    const q = query(collection(db, "tasks"), where("organizationId", "==", organizationId), where("projectId", "==", projectId));
    return onSnapshot(
      q,
      (snapshot) => {
        resultsByProject.set(projectId, snapshot.docs.map(taskFromDoc));
        emit();
      },
      (error) => onError(getFirestoreErrorMessage(error, "tasks:forProjects"))
    );
  });
  return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
}

export interface TaskInput {
  organizationId: string;
  teamId: string;
  projectId: string;
  ownerId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignedTo: string;
  reviewerId?: string | null;
  estimatedHours?: number | null;
  actualHours?: number | null;
  dueDate: string;
  labels?: string[];
}

// Guards against float-drift noise (e.g. repeated +0.1 additions elsewhere
// producing 5.300000000000001) without forcing any particular input
// granularity — two decimal places is more precision than an hours estimate
// ever needs.
function roundHours(value: number | null | undefined): number | null | undefined {
  return typeof value === "number" ? Math.round(value * 100) / 100 : value;
}

export async function createTask(input: TaskInput): Promise<string> {
  try {
    const ref = doc(collection(db, "tasks"));
    const now = serverTimestamp();
    await setDoc(ref, {
      ...input,
      reviewerId: input.reviewerId ?? null,
      estimatedHours: roundHours(input.estimatedHours) ?? null,
      actualHours: roundHours(input.actualHours) ?? null,
      labels: input.labels ?? [],
      createdAt: now,
      updatedAt: now,
    });
    return ref.id;
  } catch (error) {
    throw new Error(getFirestoreErrorMessage(error, "tasks:create"));
  }
}

export async function updateTask(taskId: string, input: TaskInput): Promise<void> {
  try {
    await updateDoc(doc(db, "tasks", taskId), {
      ...input,
      reviewerId: input.reviewerId ?? null,
      estimatedHours: roundHours(input.estimatedHours) ?? null,
      actualHours: roundHours(input.actualHours) ?? null,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    throw new Error(getFirestoreErrorMessage(error, "tasks:update"));
  }
}

/** The only mutation a non-admin assignee is allowed to make (firestore.rules enforces this server-side too) — Kanban drag-drop and the task detail status control. */
export async function updateTaskStatus(taskId: string, status: TaskStatus): Promise<void> {
  try {
    await updateDoc(doc(db, "tasks", taskId), { status, updatedAt: serverTimestamp() });
  } catch (error) {
    throw new Error(getFirestoreErrorMessage(error, "tasks:updateStatus"));
  }
}

export async function deleteTask(taskId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "tasks", taskId));
  } catch (error) {
    throw new Error(getFirestoreErrorMessage(error, "tasks:delete"));
  }
}
