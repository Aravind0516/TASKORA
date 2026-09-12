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
import type { Project, ProjectPriority, ProjectStatus } from "@/types/project";

function projectFromDoc(docSnap: QueryDocumentSnapshot): Project {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    organizationId: data.organizationId,
    teamId: data.teamId,
    name: data.name,
    description: data.description,
    status: data.status,
    priority: data.priority,
    progress: data.progress,
    startDate: data.startDate,
    dueDate: data.dueDate,
    ownerId: data.ownerId,
    managerId: data.managerId ?? null,
    memberIds: data.memberIds ?? [],
    archived: Boolean(data.archived),
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
  };
}

export function subscribeToProjects(
  organizationId: string,
  onData: (projects: Project[]) => void,
  onError: (message: string) => void
): () => void {
  const q = query(collection(db, "projects"), where("organizationId", "==", organizationId), orderBy("updatedAt", "desc"));
  return onSnapshot(
    q,
    (snapshot) => onData(snapshot.docs.map(projectFromDoc)),
    (error) => onError(getFirestoreErrorMessage(error, "projects"))
  );
}

export function subscribeToProject(
  organizationId: string,
  projectId: string,
  onData: (project: Project | null) => void,
  onError: (message: string) => void
): () => void {
  return onSnapshot(
    doc(db, "projects", projectId),
    (snapshot) => {
      if (!snapshot.exists() || snapshot.data().organizationId !== organizationId) {
        onData(null);
        return;
      }
      onData(projectFromDoc(snapshot as QueryDocumentSnapshot));
    },
    (error) => onError(getFirestoreErrorMessage(error, "project"))
  );
}

/** Super Admin only — enforced by firestore.rules. */
export function subscribeToAllProjects(onData: (projects: Project[]) => void, onError: (message: string) => void): () => void {
  return onSnapshot(
    query(collection(db, "projects"), orderBy("updatedAt", "desc")),
    (snapshot) => onData(snapshot.docs.map(projectFromDoc)),
    (error) => onError(getFirestoreErrorMessage(error, "projects:all"))
  );
}

export interface ProjectInput {
  organizationId: string;
  teamId: string;
  name: string;
  description: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  startDate: string;
  dueDate: string;
  ownerId: string;
  managerId: string | null;
  memberIds: string[];
}

export async function createProject(input: ProjectInput): Promise<string> {
  try {
    const ref = doc(collection(db, "projects"));
    const now = serverTimestamp();
    await setDoc(ref, {
      ...input,
      progress: input.status === "Completed" ? 100 : 0,
      archived: false,
      createdAt: now,
      updatedAt: now,
    });
    return ref.id;
  } catch (error) {
    throw new Error(getFirestoreErrorMessage(error, "projects:create"));
  }
}

export async function updateProject(
  projectId: string,
  patch: Partial<ProjectInput> & { progress?: number; archived?: boolean }
): Promise<void> {
  try {
    await updateDoc(doc(db, "projects", projectId), { ...patch, updatedAt: serverTimestamp() });
  } catch (error) {
    throw new Error(getFirestoreErrorMessage(error, "projects:update"));
  }
}

export async function deleteProject(projectId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "projects", projectId));
  } catch (error) {
    throw new Error(getFirestoreErrorMessage(error, "projects:delete"));
  }
}
