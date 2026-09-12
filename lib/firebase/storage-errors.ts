import { FirebaseError } from "firebase/app";

const ERROR_MESSAGES: Record<string, string> = {
  "storage/unauthorized": "You don't have permission to access this file.",
  "storage/unauthenticated": "Your session expired. Please log in again.",
  "storage/canceled": "The upload was cancelled.",
  "storage/quota-exceeded": "Storage quota exceeded. Please contact an administrator.",
  "storage/object-not-found": "That file no longer exists.",
  "storage/retry-limit-exceeded": "The upload timed out. Please check your connection and try again.",
  "storage/invalid-checksum": "The file didn't upload correctly. Please try again.",
};

/** Mirrors lib/firebase/firestore-errors.ts's getFirestoreErrorMessage — same friendly-message philosophy, for firebase/storage error codes instead of firebase/firestore ones. */
export function getStorageErrorMessage(error: unknown, context = "unknown"): string {
  const code = error instanceof FirebaseError ? error.code : "unknown";
  console.error(`Storage [${context}]: ${code}`, error);
  return ERROR_MESSAGES[code] ?? "Something went wrong with the file. Please try again.";
}
