import { NextResponse, type NextRequest } from "next/server";
import { apiErrorResponse, ApiError } from "@/lib/server/api-response";
import { acceptInvitation } from "@/lib/server/invitations";

// Public, unauthenticated by design — this is how an invited person GETS
// their first authentication credential. Everything here is validated
// server-side against the stored token hash; nothing is trusted from the
// request body except the token itself, the name they typed, and the
// password they chose. Role, organizationId, and teamId all come from the
// invitation record, never from this request (PHASE 11).
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (typeof body?.token !== "string" || !body.token) throw new ApiError(400, "Missing invitation token.");
    if (typeof body?.name !== "string" || body.name.trim().length < 2) throw new ApiError(400, "Name is required.");
    if (typeof body?.password !== "string" || body.password.length < 8) {
      throw new ApiError(400, "Password must be at least 8 characters.");
    }

    const result = await acceptInvitation({ token: body.token, name: body.name, password: body.password });
    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
