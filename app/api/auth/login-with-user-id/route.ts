import { NextResponse, type NextRequest } from "next/server";
import { apiErrorResponse, ApiError } from "@/lib/server/api-response";
import { signInWithUserId } from "@/lib/server/auth-userid";

/** Public, unauthenticated — this IS how a User-ID login authenticates in the first place. */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    if (typeof body?.userId !== "string" || !body.userId.trim()) throw new ApiError(400, "User ID is required.");
    if (typeof body?.password !== "string" || !body.password) throw new ApiError(400, "Password is required.");

    const { customToken } = await signInWithUserId(body.userId, body.password);
    return NextResponse.json({ customToken });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
