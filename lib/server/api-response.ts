import "server-only";
import { NextResponse } from "next/server";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function isFirebaseErrorLike(error: unknown): error is { code: string; message: string } {
  return typeof error === "object" && error !== null && "code" in error && typeof (error as { code: unknown }).code === "string";
}

/**
 * Converts any thrown error from a Route Handler into a safe JSON response —
 * never leaks a raw Firebase/Admin SDK error message to the client. Mirrors
 * the friendly-message philosophy of lib/firebase/{auth-errors,firestore-errors}.ts
 * on the client side.
 */
export function apiErrorResponse(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (isFirebaseErrorLike(error)) {
    console.error(`[api] Firebase error (${error.code})`, error);
    if (error.code === "auth/email-already-exists") {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
  console.error("[api] Unexpected error", error);
  return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
}
