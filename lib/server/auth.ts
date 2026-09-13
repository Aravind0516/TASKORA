import "server-only";
import type { NextRequest } from "next/server";
import { getAdminAuth } from "@/lib/firebase/admin";
import { ApiError } from "@/lib/server/api-response";
import type { UserRole } from "@/types/user";

export interface AuthedContext {
  uid: string;
  email: string | undefined;
  name: string | undefined;
  role: UserRole;
  organizationId: string | null;
}

function errorCode(error: unknown): string | null {
  return typeof error === "object" && error !== null && "code" in error && typeof (error as { code: unknown }).code === "string"
    ? (error as { code: string }).code
    : null;
}

/**
 * Verifies the Firebase ID token sent as `Authorization: Bearer <token>` and
 * returns the caller's identity + role. Role/organizationId are read from
 * the verified token's custom claims — never from a request body field —
 * so a client can never claim to be an admin or another organization's
 * member. See PHASE 3 / PHASE 19 of the request: role and organizationId
 * must never be trusted from the client.
 *
 * IMPORTANT: this used to catch every possible failure here — Admin SDK
 * failing to initialize (missing/malformed FIREBASE_ADMIN_* credentials, or
 * a project-ID mismatch between the client Firebase config and the Admin
 * SDK's service account) as much as a genuinely expired token — and report
 * all of them as "Your session has expired." That sent users on a
 * pointless re-login loop for what was actually a server configuration
 * problem having nothing to do with their session. The two are now
 * distinguished: Admin SDK/config failures surface as a 500 server error;
 * only an actually-invalid-or-expired token reports as a session problem.
 */
export async function requireAuth(request: NextRequest): Promise<AuthedContext> {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) throw new ApiError(401, "You must be logged in.");

  let adminAuth;
  try {
    adminAuth = getAdminAuth();
  } catch (error) {
    // The Admin SDK itself never got off the ground — missing/malformed
    // FIREBASE_ADMIN_* env vars. A deployment/config problem, not the
    // caller's fault. Log the safe message only (never the credentials
    // themselves — getAdminAuth()'s own error message never includes them).
    console.error("[auth] Firebase Admin SDK is not configured:", error instanceof Error ? error.message : "unknown error");
    throw new ApiError(500, "The server is not configured correctly. Please contact an administrator.");
  }

  let decoded;
  try {
    decoded = await adminAuth.verifyIdToken(token);
  } catch (error) {
    const code = errorCode(error);
    // Only these codes mean "the token itself is genuinely no longer
    // valid" — the honest case where "log in again" is the right message.
    if (code === "auth/id-token-expired" || code === "auth/id-token-revoked" || code === "auth/user-disabled") {
      throw new ApiError(401, "Your session has expired. Please log in again.");
    }
    // Anything else — most notably auth/argument-error, which firebase-admin
    // throws for several distinct reasons (wrong "aud"/"iss" claim because
    // FIREBASE_ADMIN_PROJECT_ID doesn't match NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    // a malformed/non-JWT string, an invalid signature, or an unrecognized
    // "kid") — is a real problem, but not the user's session being expired.
    // error.message is firebase-admin's own human-readable description of
    // *which* of those it was — it never includes the token or key content,
    // only claim names/expected-vs-actual project IDs — so it's safe to log
    // and is the only way to tell these apart without guessing. Token
    // metadata (never the token itself) narrows it further: a non-JWT-shaped
    // value points at the client sending the wrong thing entirely.
    console.error(
      "[auth] ID token verification failed:",
      code ?? "unknown error code",
      "-",
      error instanceof Error ? error.message : String(error),
      `| tokenLength=${token.length} jwtParts=${token.split(".").length}`
    );
    throw new ApiError(401, "We couldn't verify your session. Please try logging in again, or contact an administrator if this keeps happening.");
  }

  const role = (decoded.role as UserRole | undefined) ?? "user";
  const organizationId = (decoded.organizationId as string | undefined) ?? null;

  return {
    uid: decoded.uid,
    email: decoded.email,
    name: typeof decoded.name === "string" ? decoded.name : undefined,
    role,
    organizationId,
  };
}

export async function requireRole(request: NextRequest, allowed: UserRole[]): Promise<AuthedContext> {
  const ctx = await requireAuth(request);
  if (!allowed.includes(ctx.role)) {
    throw new ApiError(403, "You don't have permission to perform this action.");
  }
  return ctx;
}
