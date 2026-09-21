import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { deleteObject, ref, uploadBytesResumable } from "firebase/storage";
import { db } from "@/lib/firebase/firestore";
import { getFirestoreErrorMessage } from "@/lib/firebase/firestore-errors";
import { storage } from "@/lib/firebase/storage";
import { getStorageErrorMessage } from "@/lib/firebase/storage-errors";
import { nowIso } from "@/lib/format";
import type { ProjectRequirementDocument } from "@/types/project";

// Reuses the exact same Storage bucket, upload/download primitives, and
// error-mapping helpers as lib/services/attachment.service.ts — this is
// deliberately NOT a second storage system. Diverges from attachments in
// exactly one way: a project has at most ONE requirement document (never a
// list), stored directly on the project document (types/project.ts's
// `requirementDocument` field) rather than in the separate `attachments`
// collection, so its read authorization is exactly the project's own
// existing privacy boundary — see firestore.rules' projects match block —
// with no new Firestore rule needed.
//
// Storage path carries a version segment
// (organizations/{orgId}/projects/{projectId}/requirement/v{version}) so a
// replace uploads the NEW version, then updates the project's metadata,
// and ONLY THEN deletes the OLD version's Storage object — matching the
// explicit "do not delete the existing document until the replacement has
// been successfully uploaded and metadata updated" requirement. If the
// final cleanup delete fails, the old object is simply left behind (an
// orphan, not a broken state) rather than risking the new document.

function storagePathFor(organizationId: string, projectId: string, version: number): string {
  return `organizations/${organizationId}/projects/${projectId}/requirement/v${version}`;
}

export interface UploadProjectRequirementDocumentInput {
  organizationId: string;
  projectId: string;
  uploadedBy: string;
  file: File;
  /** The document being replaced, if any — null for a first-time upload. */
  existing: ProjectRequirementDocument | null;
}

export async function uploadProjectRequirementDocument(
  input: UploadProjectRequirementDocumentInput,
  onProgress?: (pct: number) => void
): Promise<ProjectRequirementDocument> {
  const nextVersion = (input.existing?.version ?? 0) + 1;
  const storagePath = storagePathFor(input.organizationId, input.projectId, nextVersion);
  const objectRef = ref(storage, storagePath);

  try {
    await new Promise<void>((resolve, reject) => {
      const task = uploadBytesResumable(objectRef, input.file, {
        contentType: input.file.type,
        customMetadata: {
          uploadedBy: input.uploadedBy,
          organizationId: input.organizationId,
          projectId: input.projectId,
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
    throw new Error(getStorageErrorMessage(error, "project-requirement:upload"));
  }

  const requirementDocument: ProjectRequirementDocument = {
    fileName: input.file.name,
    storagePath,
    contentType: input.file.type,
    size: input.file.size,
    uploadedBy: input.uploadedBy,
    uploadedAt: nowIso(),
    version: nextVersion,
  };

  try {
    await updateDoc(doc(db, "projects", input.projectId), {
      requirementDocument,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    // Metadata write failed — clean up the just-uploaded object so it
    // doesn't become an orphan, same principle as attachment.service.ts's
    // uploadAttachment().
    try {
      await deleteObject(objectRef);
    } catch (cleanupError) {
      console.error(`project-requirement:upload — metadata write failed AND orphan cleanup failed for ${storagePath}`, cleanupError);
      throw new Error("Upload failed and the file could not be cleaned up. Please contact an administrator.");
    }
    throw new Error(getFirestoreErrorMessage(error, "project-requirement:update-project"));
  }

  // Only now — after the new version is live in Firestore — remove the
  // previous version's Storage object. Best-effort: a failure here leaves
  // a harmless orphaned object, never the new document.
  if (input.existing) {
    try {
      await deleteObject(ref(storage, input.existing.storagePath));
    } catch (error) {
      console.error(`project-requirement:upload — old version cleanup failed for ${input.existing.storagePath}`, error);
    }
  }

  return requirementDocument;
}
