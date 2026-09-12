import { FirebaseError } from "firebase/app";

const ERROR_MESSAGES: Record<string, string> = {
  "permission-denied": "You don't have permission to access this information.",
  unauthenticated: "Your session expired. Please log in again.",
  unavailable: "Unable to connect right now. Please try again.",
  "not-found": "That item no longer exists.",
  "already-exists": "That item already exists.",
  cancelled: "The request was cancelled.",
  "deadline-exceeded": "The request timed out. Please try again.",
  "resource-exhausted": "Too many requests. Please wait a moment and try again.",
  "failed-precondition": "This request couldn't be completed right now. Please try again.",
};

// Avoids console spam when the same failure (same context + same error code)
// fires repeatedly — e.g. every collection under one WorkspaceProvider mount
// failing for the same root cause logs once in full, not once per listener.
const loggedOnce = new Set<string>();

/**
 * Converts a Firestore error into a friendly, safe-to-show message.
 *
 * `context` should identify the query (e.g. "projects", "tasks") so devtools
 * logs read as "collection: error code" instead of a wall of identical raw
 * Firebase messages. Never suppressed for developers — only de-duplicated:
 * the first occurrence per context+code logs in full (with a pointer to
 * firestore.indexes.json for missing-index errors), later repeats log a
 * single quiet line instead of the full Firebase payload again.
 */
export function getFirestoreErrorMessage(error: unknown, context = "unknown"): string {
  const code = error instanceof FirebaseError ? error.code : "unknown";
  const key = `${context}:${code}`;
  const isMissingIndex =
    code === "failed-precondition" && error instanceof FirebaseError && /index/i.test(error.message);

  if (!loggedOnce.has(key)) {
    loggedOnce.add(key);
    if (isMissingIndex) {
      console.error(
        `Firestore [${context}]: missing composite index (code: ${code}). ` +
          "Add it to firestore.indexes.json and publish in Firebase Console — " +
          "the full error below includes a direct creation link.",
        error
      );
    } else {
      console.error(`Firestore [${context}]: ${code}`, error);
    }
  } else {
    console.debug(`Firestore [${context}]: ${code} (repeat suppressed — see first occurrence above)`);
  }

  return ERROR_MESSAGES[code] ?? "Something went wrong. Please try again.";
}
