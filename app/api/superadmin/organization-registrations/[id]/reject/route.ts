import { NextResponse, type NextRequest } from "next/server";
import { requireRole } from "@/lib/server/auth";
import { apiErrorResponse, ApiError } from "@/lib/server/api-response";
import { rejectOrganizationRegistration } from "@/lib/server/organization-registrations";

/** SUPER_ADMIN only — same enforcement shape as approve/route.ts. A reviewer comment is required (never a silent rejection). */
export async function POST(request: NextRequest, props: RouteContext<"/api/superadmin/organization-registrations/[id]/reject">) {
  try {
    const ctx = await requireRole(request, ["super_admin"]);
    const { id } = await props.params;
    const body = await request.json().catch(() => ({}));
    if (typeof body?.reviewerComment !== "string" || body.reviewerComment.trim().length === 0) {
      throw new ApiError(400, "A reason is required to reject a registration request.");
    }

    const requestDoc = await rejectOrganizationRegistration({
      requestId: id,
      reviewerId: ctx.uid,
      reviewerComment: body.reviewerComment.trim().slice(0, 500),
    });
    return NextResponse.json({ request: requestDoc });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
