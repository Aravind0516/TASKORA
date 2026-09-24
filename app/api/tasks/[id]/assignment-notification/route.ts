import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { apiErrorResponse } from "@/lib/server/api-response";
import { notifyTaskAssignment } from "@/lib/server/task-assignment";

/**
 * Creates the task_assigned notification for a task's CURRENT, persisted
 * assignment — called by the client right after a task write that created
 * or changed the assignment. Takes no body: recipient, version and wording
 * all come from the stored task (see lib/server/task-assignment.ts), and
 * authorization is re-checked there against the task's own organization and
 * project manager — requireAuth() only establishes who is calling.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const ctx = await requireAuth(request);
    const result = await notifyTaskAssignment(id, ctx.uid, ctx.role, ctx.organizationId);
    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
