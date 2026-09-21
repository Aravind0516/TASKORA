import { NextResponse, type NextRequest } from "next/server";
import { requireRole } from "@/lib/server/auth";
import { apiErrorResponse, ApiError } from "@/lib/server/api-response";
import { setOrganizationStatus } from "@/lib/server/organizations";

export async function PATCH(request: NextRequest, props: RouteContext<"/api/organizations/[id]/status">) {
  try {
    const ctx = await requireRole(request, ["super_admin"]);
    const { id } = await props.params;
    const body = await request.json().catch(() => ({}));

    if (body?.status !== "active" && body?.status !== "suspended") {
      throw new ApiError(400, "status must be 'active' or 'suspended'.");
    }

    await setOrganizationStatus(id, body.status, ctx.uid);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
