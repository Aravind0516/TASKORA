import {
  collection,
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
import type { Deliverable, DeliverableStatus } from "@/types/deliverable";

function deliverableFromDoc(docSnap: QueryDocumentSnapshot): Deliverable {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    organizationId: data.organizationId,
    projectId: data.projectId,
    title: data.title,
    description: data.description ?? "",
    status: data.status ?? "Pending",
    dueDate: data.dueDate ?? null,
    assignedTo: data.assignedTo ?? null,
    createdBy: data.createdBy,
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
    completedAt: data.completedAt ? toIso(data.completedAt) : null,
  };
}

/** Read inherits the parent project's authorization (isAuthorizedForProject) in firestore.rules — a deliverable is exactly as visible as the project it belongs to, never broader. */
export function subscribeToProjectDeliverables(
  organizationId: string,
  projectId: string,
  onData: (deliverables: Deliverable[]) => void,
  onError: (message: string) => void
): () => void {
  const q = query(
    collection(db, "projectDeliverables"),
    where("organizationId", "==", organizationId),
    where("projectId", "==", projectId),
    orderBy("updatedAt", "desc")
  );
  return onSnapshot(
    q,
    (snapshot) => onData(snapshot.docs.map(deliverableFromDoc)),
    (error) => onError(getFirestoreErrorMessage(error, "projectDeliverables"))
  );
}

export interface CreateDeliverableInput {
  organizationId: string;
  projectId: string;
  title: string;
  description: string;
  status: DeliverableStatus;
  dueDate: string | null;
  assignedTo: string | null;
  createdBy: string;
}

/** Admin/project-manager only per firestore.rules — matches tasks' create authorization exactly. */
export async function createDeliverable(input: CreateDeliverableInput): Promise<string> {
  try {
    const ref = doc(collection(db, "projectDeliverables"));
    const now = serverTimestamp();
    await setDoc(ref, {
      organizationId: input.organizationId,
      projectId: input.projectId,
      title: input.title,
      description: input.description,
      status: input.status,
      dueDate: input.dueDate,
      assignedTo: input.assignedTo,
      createdBy: input.createdBy,
      completedAt: input.status === "Delivered" ? now : null,
      createdAt: now,
      updatedAt: now,
    });
    return ref.id;
  } catch (error) {
    throw new Error(getFirestoreErrorMessage(error, "projectDeliverables:create"));
  }
}

export interface UpdateDeliverableInput {
  title?: string;
  description?: string;
  status?: DeliverableStatus;
  dueDate?: string | null;
  assignedTo?: string | null;
}

/** Admin/project-manager only per firestore.rules. Setting status to "Delivered" stamps completedAt automatically; moving away from it clears that stamp rather than leaving a stale one. */
export async function updateDeliverable(deliverableId: string, patch: UpdateDeliverableInput): Promise<void> {
  try {
    await updateDoc(doc(db, "projectDeliverables", deliverableId), {
      ...patch,
      ...(patch.status ? { completedAt: patch.status === "Delivered" ? serverTimestamp() : null } : {}),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    throw new Error(getFirestoreErrorMessage(error, "projectDeliverables:update"));
  }
}
