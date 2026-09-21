import "server-only";
import { getAdminDb } from "@/lib/firebase/admin";
import { ApiError } from "@/lib/server/api-response";

// Global uniqueness for Admin-assigned User/Candidate IDs (e.g.
// "NXT26-IT-0001"), enforced via a reservation document whose id IS the
// normalized User ID — reservation and uniqueness-check happen inside one
// Firestore transaction (create fails outright if the doc already exists),
// never a client-side/racy "query then write." Global rather than per-org
// per the request ("globally unique if the current architecture supports
// it") — a single top-level collection makes that trivial.

const USER_ID_PATTERN = /^[A-Z0-9]+(-[A-Z0-9]+)*$/;

export function normalizeUserId(raw: string): string {
  return raw.trim().toUpperCase();
}

export function isValidUserIdFormat(userId: string): boolean {
  return userId.length >= 3 && userId.length <= 40 && USER_ID_PATTERN.test(userId);
}

export async function isUserIdAvailable(rawUserId: string): Promise<boolean> {
  const userId = normalizeUserId(rawUserId);
  if (!isValidUserIdFormat(userId)) return false;
  const snap = await getAdminDb().collection("userIdReservations").doc(userId).get();
  return !snap.exists;
}

/**
 * Atomically reserves a User ID for one invitation. Throws ApiError(409) if
 * already taken — the transaction's own create-on-existing-id failure is
 * the actual collision-safety mechanism, not the isUserIdAvailable() check
 * above (which is only a fast pre-check for the live "✓ Available" UI and is
 * inherently racy on its own).
 */
export async function reserveUserId(rawUserId: string, organizationId: string, invitationId: string): Promise<string> {
  const userId = normalizeUserId(rawUserId);
  if (!isValidUserIdFormat(userId)) {
    throw new ApiError(400, "User ID must be 3-40 characters, letters/numbers/hyphens only (e.g. NXT26-IT-0001).");
  }
  const ref = getAdminDb().collection("userIdReservations").doc(userId);
  await getAdminDb().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists) {
      throw new ApiError(409, `User ID "${userId}" is already in use.`);
    }
    tx.set(ref, {
      userId,
      organizationId,
      invitationId,
      uid: null,
      createdAt: new Date().toISOString(),
    });
  });
  return userId;
}

/** Called when an invitation carrying a reserved User ID is cancelled — frees it for reuse. */
export async function releaseUserId(rawUserId: string): Promise<void> {
  const userId = normalizeUserId(rawUserId);
  await getAdminDb().collection("userIdReservations").doc(userId).delete();
}

/** Called at invitation acceptance — attaches the now-real uid to the reservation so login-by-User-ID can resolve it. */
export async function attachUidToUserId(rawUserId: string, uid: string): Promise<void> {
  const userId = normalizeUserId(rawUserId);
  await getAdminDb().collection("userIdReservations").doc(userId).set({ uid }, { merge: true });
}

/** Login-by-User-ID resolution — returns null if the User ID doesn't exist OR hasn't been activated yet (no uid attached), never distinguishing the two to the caller (anti-enumeration). */
export async function resolveUserIdToUid(rawUserId: string): Promise<string | null> {
  const userId = normalizeUserId(rawUserId);
  const snap = await getAdminDb().collection("userIdReservations").doc(userId).get();
  if (!snap.exists) return null;
  const uid = snap.data()?.uid;
  return typeof uid === "string" && uid ? uid : null;
}
