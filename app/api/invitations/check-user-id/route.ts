import { NextResponse, type NextRequest } from "next/server";
import { requireRole } from "@/lib/server/auth";
import { apiErrorResponse, ApiError } from "@/lib/server/api-response";
import { isUserIdAvailable, isValidUserIdFormat, normalizeUserId } from "@/lib/server/user-ids";

/** Live "✓ Available / ✗ already exists" check for the Add User form — Admin/Super Admin only. */
export async function GET(request: NextRequest) {
  try {
    await requireRole(request, ["admin", "super_admin"]);
    const userId = request.nextUrl.searchParams.get("userId");
    if (!userId || !userId.trim()) throw new ApiError(400, "userId is required.");

    const normalized = normalizeUserId(userId);
    if (!isValidUserIdFormat(normalized)) {
      return NextResponse.json({ available: false, reason: "invalid-format" });
    }
    const available = await isUserIdAvailable(normalized);
    return NextResponse.json({ available, reason: available ? null : "taken" });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
