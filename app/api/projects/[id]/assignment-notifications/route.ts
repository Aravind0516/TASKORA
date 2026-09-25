import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { apiErrorResponse, ApiError } from "@/lib/server/api-response";
import { notifyProjectAssignment } from "@/lib/server/project-assignment";

/**
 * Notifies the people a project save just assigned (as members or manager).
 * The body only names candidate recipients; the server re-checks the caller's
 * authority and that each recipient is actually assigned to the persisted
 * project, and derives the notification's identity from the project's
 * memberAssignmentVersions — see lib/server/project-assignment.ts.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const ctx = await requireAuth(request);
    const body = await request.json().catch(() => ({}));
    const recipientIds: unknown = body?.recipientIds;
    if (!Array.isArray(recipientIds) || !recipientIds.every((r) => typeof r === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(r))) {
      throw new ApiError(400, "recipientIds must be a list of user ids.");
    }
    if (recipientIds.length > 500) throw new ApiError(400, "Too many recipients.");
    const result = await notifyProjectAssignment(id, recipientIds, ctx.uid, ctx.role, ctx.organizationId);
    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
