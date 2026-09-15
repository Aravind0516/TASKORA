import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
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
import type { Comment } from "@/types/comment";

function commentFromDoc(docSnap: QueryDocumentSnapshot): Comment {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    organizationId: data.organizationId,
    authorId: data.authorId,
    content: data.content,
    projectId: data.projectId,
    taskId: data.taskId ?? null,
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
  };
}

/**
 * Scoped to one task, not the whole organization — same rationale as
 * subtasks (lib/services/subtask.service.ts): only ever needed while that
 * task's dialog is open, so a global always-on listener would be wasted.
 * No orderBy in the query itself (sorted client-side after the snapshot,
 * same pattern as lib/services/invitation.service.ts) — comment volume per
 * task/project is small, and this avoids a composite index for what
 * equality filters already serve.
 *
 * organizationId AND projectId are both included as explicit filters even
 * though taskId alone is already enough to uniquely scope the results —
 * Firestore evaluates a `list` query's security rule against the QUERY'S
 * OWN filters, not the actual matching documents, so a rule that checks
 * resource.data.organizationId/projectId is unprovable (and the whole query
 * is denied) unless those fields are themselves among the query's where()
 * clauses. Every other collection in this app already follows this (see
 * subscribeToTasks, subscribeToProjects) — this was a real bug caught by
 * live-testing, not a stylistic choice. projectId specifically is what lets
 * firestore.rules' isAuthorizedForProject() (a get()-based project
 * membership check) be verified from this query at all — a comment's own
 * project privacy inherits directly from its parent project/task.
 */
export function subscribeToTaskComments(
  organizationId: string,
  projectId: string,
  taskId: string,
  onData: (comments: Comment[]) => void,
  onError: (message: string) => void
): () => void {
  const q = query(
    collection(db, "comments"),
    where("organizationId", "==", organizationId),
    where("projectId", "==", projectId),
    where("taskId", "==", taskId)
  );
  return onSnapshot(
    q,
    (snapshot) => onData(snapshot.docs.map(commentFromDoc).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())),
    (error) => onError(getFirestoreErrorMessage(error, "comments:task"))
  );
}

/** Project-level discussion only (taskId == null) — a project's task comments are scoped separately per task, never mixed into this list. See subscribeToTaskComments' doc comment for why organizationId is an explicit filter here too. */
export function subscribeToProjectComments(
  organizationId: string,
  projectId: string,
  onData: (comments: Comment[]) => void,
  onError: (message: string) => void
): () => void {
  const q = query(
    collection(db, "comments"),
    where("organizationId", "==", organizationId),
    where("projectId", "==", projectId),
    where("taskId", "==", null)
  );
  return onSnapshot(
    q,
    (snapshot) => onData(snapshot.docs.map(commentFromDoc).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())),
    (error) => onError(getFirestoreErrorMessage(error, "comments:project"))
  );
}

export interface CreateCommentInput {
  organizationId: string;
  authorId: string;
  content: string;
  projectId: string;
  /** null for a project-level comment. */
  taskId: string | null;
}

export async function createComment(input: CreateCommentInput): Promise<string> {
  try {
    const ref = doc(collection(db, "comments"));
    const now = serverTimestamp();
    await setDoc(ref, {
      organizationId: input.organizationId,
      authorId: input.authorId,
      content: input.content,
      projectId: input.projectId,
      taskId: input.taskId,
      createdAt: now,
      updatedAt: now,
    });
    return ref.id;
  } catch (error) {
    throw new Error(getFirestoreErrorMessage(error, "comments:create"));
  }
}

/** Content only — firestore.rules enforces that organizationId/authorId/projectId/taskId can never change via this or any other update. */
export async function updateComment(commentId: string, content: string): Promise<void> {
  try {
    await updateDoc(doc(db, "comments", commentId), { content, updatedAt: serverTimestamp() });
  } catch (error) {
    throw new Error(getFirestoreErrorMessage(error, "comments:update"));
  }
}

export async function deleteComment(commentId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "comments", commentId));
  } catch (error) {
    throw new Error(getFirestoreErrorMessage(error, "comments:delete"));
  }
}
