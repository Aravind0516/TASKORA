// Centralized file-attachment allow-list — the single source of truth for
// what this app accepts as a project/task attachment. Mirrored (by content
// type and size) in storage.rules' isAllowedContentType()/isWithinSizeLimit()
// so the server-side enforcement never silently drifts from this client-side
// list — if you change either, change both and note it in the other file's
// comment. No .exe/.bat/.cmd/.sh/.js or any other executable format is ever
// on this list, and none should be added without revisiting storage.rules.

export const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export const MAX_ATTACHMENT_FILENAME_LENGTH = 255;

/** contentType -> accepted file extensions (lowercase, no dot). A browser's reported MIME type is trusted only loosely (see validateAttachmentFile) — the real backstop is storage.rules checking the uploaded object's actual contentType. */
export const ALLOWED_ATTACHMENT_TYPES: Record<string, string[]> = {
  "application/pdf": ["pdf"],
  "application/msword": ["doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ["docx"],
  "application/vnd.ms-excel": ["xls"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ["xlsx"],
  "application/vnd.ms-powerpoint": ["ppt"],
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": ["pptx"],
  "text/csv": ["csv"],
  "text/plain": ["txt"],
  "image/png": ["png"],
  "image/jpeg": ["jpg", "jpeg"],
  "image/gif": ["gif"],
  "image/webp": ["webp"],
};

/** Accepted by <input accept=...> — kept in sync with ALLOWED_ATTACHMENT_TYPES automatically rather than hand-duplicated. */
export const ATTACHMENT_INPUT_ACCEPT = Object.keys(ALLOWED_ATTACHMENT_TYPES).join(",");

/**
 * Narrower subsets for Daily Work Update evidence, which asks specifically
 * for "a screenshot" or "a document" rather than any attachment — storage.rules'
 * isAllowedContentType() already permits this full superset, so restricting
 * further here is a UX choice (guiding the right file for the right
 * evidence type), not an additional security boundary.
 */
export const IMAGE_ATTACHMENT_TYPES: Record<string, string[]> = {
  "image/png": ["png"],
  "image/jpeg": ["jpg", "jpeg"],
  "image/webp": ["webp"],
};
export const DOCUMENT_ATTACHMENT_TYPES: Record<string, string[]> = {
  "application/pdf": ["pdf"],
  "application/msword": ["doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ["docx"],
  "application/vnd.ms-excel": ["xls"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ["xlsx"],
  "application/vnd.ms-powerpoint": ["ppt"],
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": ["pptx"],
  "text/plain": ["txt"],
};
export const IMAGE_ATTACHMENT_INPUT_ACCEPT = Object.keys(IMAGE_ATTACHMENT_TYPES).join(",");
export const DOCUMENT_ATTACHMENT_INPUT_ACCEPT = Object.keys(DOCUMENT_ATTACHMENT_TYPES).join(",");

/**
 * A project's official requirement document — deliberately narrower than
 * DOCUMENT_ATTACHMENT_TYPES (PDF/DOC/DOCX only, per the requirement-document
 * spec), mirrored in storage.rules' isAllowedRequirementContentType() so
 * server-side enforcement never drifts from this client-side list.
 */
export const REQUIREMENT_DOCUMENT_TYPES: Record<string, string[]> = {
  "application/pdf": ["pdf"],
  "application/msword": ["doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ["docx"],
};
export const REQUIREMENT_DOCUMENT_INPUT_ACCEPT = Object.keys(REQUIREMENT_DOCUMENT_TYPES).join(",");

function extensionOf(fileName: string): string {
  const idx = fileName.lastIndexOf(".");
  return idx === -1 || idx === fileName.length - 1 ? "" : fileName.slice(idx + 1).toLowerCase();
}

export interface AttachmentValidationResult {
  ok: boolean;
  error?: string;
}

/**
 * Client-side validation only — never the actual security boundary (that's
 * storage.rules, enforced server-side regardless of what this function
 * decides). Exists to give the user a fast, friendly rejection before a
 * doomed upload attempt, and to reject the obviously-wrong extension/MIME
 * mismatch case a renamed-.exe-to-.pdf trick would produce. `allowedTypes`
 * defaults to the full attachment allow-list; pass IMAGE_ATTACHMENT_TYPES or
 * DOCUMENT_ATTACHMENT_TYPES for a narrower, evidence-type-specific check.
 */
export function validateAttachmentFile(file: File, allowedTypes: Record<string, string[]> = ALLOWED_ATTACHMENT_TYPES): AttachmentValidationResult {
  if (file.size <= 0) {
    return { ok: false, error: "That file is empty." };
  }
  if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
    return { ok: false, error: `File is too large — the maximum is ${MAX_ATTACHMENT_SIZE_BYTES / (1024 * 1024)} MB.` };
  }
  if (file.name.length > MAX_ATTACHMENT_FILENAME_LENGTH) {
    return { ok: false, error: "Filename is too long." };
  }
  const allowedExtensions = allowedTypes[file.type];
  if (!allowedExtensions) {
    return { ok: false, error: "That file type isn't allowed here." };
  }
  const extension = extensionOf(file.name);
  if (!allowedExtensions.includes(extension)) {
    return { ok: false, error: "This file's extension doesn't match its detected type." };
  }
  return { ok: true };
}
