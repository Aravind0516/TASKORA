import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { apiErrorResponse } from "@/lib/server/api-response";
import { submitProject } from "@/lib/server/project-submission";

/**
 * Marks a project SUBMITTED using a server timestamp (never the browser
 * clock) and fans out PROJECT_SUBMISSION / ON_TIME_PROJECT credit awards to
 * every member. Authorization is re-checked inside submitProject() against
 * the project's own managerId/organizationId — requireAuth() here only
 * establishes WHO is calling, never assumes any particular role is allowed.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const ctx = await requireAuth(request);
    const result = await submitProject(id, ctx.uid, ctx.role, ctx.organizationId);
    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
