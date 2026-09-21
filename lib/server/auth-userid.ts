import "server-only";
import { getAdminAuth } from "@/lib/firebase/admin";
import { ApiError } from "@/lib/server/api-response";
import { resolveUserIdToUid } from "@/lib/server/user-ids";

// Login-by-User-ID: the browser never learns the account's real email, and
// Firebase Auth (not this app) remains the sole password authority — this
// module only (a) resolves userId -> uid -> email via the Admin SDK, then
// (b) verifies the password the SAME way the Firebase client SDK itself
// would, by calling Identity Toolkit's REST signInWithPassword endpoint
// server-side. There is no Admin SDK method to verify a password directly
// (by design — Admin SDK is a trusted-server API, not an auth endpoint), so
// this REST call is the correct, standard way to check a password
// server-side while still deferring the actual check to Firebase Auth.
// Every failure path (unknown User ID, wrong password, disabled account)
// returns the exact same generic error — never revealing which one it was.

const GENERIC_ERROR = "Invalid User ID or password.";

interface SignInWithPasswordResponse {
  localId?: string;
  error?: { message?: string };
}

async function verifyPasswordViaRest(email: string, password: string): Promise<boolean> {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) {
    console.error("[auth-userid] NEXT_PUBLIC_FIREBASE_API_KEY is not set — cannot verify password.");
    throw new ApiError(500, "The server is not configured correctly. Please contact an administrator.");
  }
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, returnSecureToken: false }),
  });
  const body = (await response.json().catch(() => ({}))) as SignInWithPasswordResponse;
  return response.ok && Boolean(body.localId);
}

/**
 * Resolves a User ID + password to a short-lived Firebase custom token the
 * browser can sign in with (signInWithCustomToken) — the email itself is
 * never sent to or exposed in the client response.
 */
export async function signInWithUserId(rawUserId: string, password: string): Promise<{ customToken: string }> {
  const uid = await resolveUserIdToUid(rawUserId);
  if (!uid) throw new ApiError(401, GENERIC_ERROR);

  let email: string | undefined;
  try {
    const record = await getAdminAuth().getUser(uid);
    email = record.email;
    if (record.disabled) throw new ApiError(401, GENERIC_ERROR);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    // e.g. auth/user-not-found — the reservation pointed at a uid that no
    // longer exists. Same generic error, never a different message.
    throw new ApiError(401, GENERIC_ERROR);
  }
  if (!email) throw new ApiError(401, GENERIC_ERROR);

  const passwordOk = await verifyPasswordViaRest(email, password);
  if (!passwordOk) throw new ApiError(401, GENERIC_ERROR);

  const customToken = await getAdminAuth().createCustomToken(uid);
  return { customToken };
}
