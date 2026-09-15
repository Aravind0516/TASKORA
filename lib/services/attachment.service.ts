import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { deleteObject, getBlob, ref, uploadBytesResumable } from "firebase/storage";
import { db } from "@/lib/firebase/firestore";
import { getFirestoreErrorMessage } from "@/lib/firebase/firestore-errors";
import { storage } from "@/lib/firebase/storage";
import { getStorageErrorMessage } from "@/lib/firebase/storage-errors";
import { toIso } from "@/lib/firebase/timestamp";
import type { Attachment } from "@/types/attachment";

function attachmentFromDoc(docSnap: QueryDocumentSnapshot): Attachment {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    organizationId: data.organizationId,
    projectId: data.projectId,
    taskId: data.taskId ?? null,
    fileName: data.fileName,
    storagePath: data.storagePath,
    contentType: data.contentType,
    size: data.size,
    uploadedBy: data.uploadedBy,
    createdAt: toIso(data.createdAt),
  };
}

/**
 * organizationId is included as an explicit query filter for the same reason
 * as comment.service.ts's subscribeToTaskComments — Firestore evaluates a
 * `list` query's security rule against the query's own filters, not the
 * matching documents, so firestore.rules' organizationId check is
 * unprovable unless organizationId is itself one of the where() clauses.
 * No orderBy in the query (sorted client-side after the snapshot) — same
 * choice as comments/subtasks: attachment volume per project/task is small,
 * and this avoids a composite index for what equality filters already serve.
 */
export function subscribeToProjectAttachments(
  organizationId: string,
  projectId: string,
  onData: (attachments: Attachment[]) => void,
  onError: (message: string) => void
): () => void {
  const q = query(
    collection(db, "attachments"),
    where("organizationId", "==", organizationId),
    where("projectId", "==", projectId),
    where("taskId", "==", null)
  );
  return onSnapshot(
    q,
    (snapshot) => onData(snapshot.docs.map(attachmentFromDoc).sort(byCreatedAtDesc)),
    (error) => onError(getFirestoreErrorMessage(error, "attachments:project"))
  );
}

/**
 * organizationId AND projectId are both explicit filters for the same
 * reason comment.service.ts's subscribeToTaskComments documents —
 * firestore.rules' isAuthorizedForProject() check needs projectId pinned by
 * this query to be provable for a plain member.
 */
export function subscribeToTaskAttachments(
  organizationId: string,
  projectId: string,
  taskId: string,
  onData: (attachments: Attachment[]) => void,
  onError: (message: string) => void
): () => void {
  const q = query(
    collection(db, "attachments"),
    where("organizationId", "==", organizationId),
    where("projectId", "==", projectId),
    where("taskId", "==", taskId)
  );
  return onSnapshot(
    q,
    (snapshot) => onData(snapshot.docs.map(attachmentFromDoc).sort(byCreatedAtDesc)),
    (error) => onError(getFirestoreErrorMessage(error, "attachments:task"))
  );
}

function byCreatedAtDesc(a: Attachment, b: Attachment): number {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

function storagePathFor(organizationId: string, projectId: string, taskId: string | null, attachmentId: string): string {
  return taskId
    ? `organizations/${organizationId}/projects/${projectId}/tasks/${taskId}/attachments/${attachmentId}`
    : `organizations/${organizationId}/projects/${projectId}/attachments/${attachmentId}`;
}

export interface UploadAttachmentInput {
  organizationId: string;
  projectId: string;
  /** null for a project-level attachment. */
  taskId: string | null;
  uploadedBy: string;
  file: File;
}

/**
 * Upload-then-record, never the other way around — so a failed upload can
 * never produce metadata pointing at a file that doesn't exist. The
 * attachment id is allocated up front (a plain Firestore auto-id) purely to
 * name the Storage object; nothing about the file's original name or
 * extension ever appears in the Storage path (see types/attachment.ts).
 *
 * If the Storage upload itself fails, there's nothing to clean up (no
 * metadata was ever written). If the upload succeeds but the metadata write
 * fails, the just-uploaded object is deleted (best-effort) so it doesn't
 * become an orphan; if that cleanup itself fails, the error is logged with
 * the storage path so it's at least discoverable, and the thrown error says
 * so explicitly rather than reporting a clean failure.
 */
export async function uploadAttachment(
  input: UploadAttachmentInput,
  onProgress?: (pct: number) => void
): Promise<Attachment> {
  const attachmentRef = doc(collection(db, "attachments"));
  const storagePath = storagePathFor(input.organizationId, input.projectId, input.taskId, attachmentRef.id);
  const objectRef = ref(storage, storagePath);

  try {
    await new Promise<void>((resolve, reject) => {
      const task = uploadBytesResumable(objectRef, input.file, {
        contentType: input.file.type,
        customMetadata: {
          uploadedBy: input.uploadedBy,
          organizationId: input.organizationId,
          projectId: input.projectId,
          ...(input.taskId ? { taskId: input.taskId } : {}),
        },
      });
      task.on(
        "state_changed",
        (snapshot) => onProgress?.(Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)),
        reject,
        resolve
      );
    });
  } catch (error) {
    throw new Error(getStorageErrorMessage(error, "attachments:upload"));
  }

  try {
    await setDoc(attachmentRef, {
      organizationId: input.organizationId,
      projectId: input.projectId,
      taskId: input.taskId,
      fileName: input.file.name,
      storagePath,
      contentType: input.file.type,
      size: input.file.size,
      uploadedBy: input.uploadedBy,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    try {
      await deleteObject(objectRef);
    } catch (cleanupError) {
      console.error(`attachments:upload — metadata write failed AND orphan cleanup failed for ${storagePath}`, cleanupError);
      throw new Error("Upload failed and the file could not be cleaned up. Please contact an administrator.");
    }
    throw new Error(getFirestoreErrorMessage(error, "attachments:create"));
  }

  return {
    id: attachmentRef.id,
    organizationId: input.organizationId,
    projectId: input.projectId,
    taskId: input.taskId,
    fileName: input.file.name,
    storagePath,
    contentType: input.file.type,
    size: input.file.size,
    uploadedBy: input.uploadedBy,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Storage object first, then Firestore metadata — mirroring upload's order
 * in reverse. If the Storage delete fails, the metadata is left untouched
 * (the file still exists, so a dangling-metadata state is correct, not a
 * bug). If the Storage delete succeeds but the metadata delete fails, this
 * throws a distinct error rather than silently reporting success — the
 * caller must not tell the user the attachment is fully gone.
 */
export async function deleteAttachment(attachment: Attachment): Promise<void> {
  try {
    await deleteObject(ref(storage, attachment.storagePath));
  } catch (error) {
    throw new Error(getStorageErrorMessage(error, "attachments:delete-file"));
  }

  try {
    await deleteDoc(doc(db, "attachments", attachment.id));
  } catch (error) {
    console.error(`attachments:delete — file removed but metadata delete failed for ${attachment.id}`, error);
    throw new Error("The file was deleted, but its record could not be removed. Please refresh and try again, or contact an administrator.");
  }
}

/**
 * Fetches the file's bytes through the authenticated SDK (storage.rules is
 * evaluated on this request) and hands back a short-lived object: URL for the
 * browser to save/open — never firebase/storage's getDownloadURL(), which
 * mints a shareable token URL that bypasses security rules for anyone who
 * later holds the link. Caller must revokeObjectURL(url) once done with it.
 */
export async function downloadAttachmentBlob(storagePath: string): Promise<string> {
  try {
    const blob = await getBlob(ref(storage, storagePath));
    return URL.createObjectURL(blob);
  } catch (error) {
    throw new Error(getStorageErrorMessage(error, "attachments:download"));
  }
}
