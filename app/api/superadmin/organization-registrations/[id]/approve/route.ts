import { NextResponse, type NextRequest } from "next/server";
import { requireRole } from "@/lib/server/auth";
import { apiErrorResponse } from "@/lib/server/api-response";
import { approveOrganizationRegistration } from "@/lib/server/organization-registrations";

/** SUPER_ADMIN only — enforced here (requireRole) AND independently by firestore.rules' organizationRegistrationRequests block denying every client update, so approval can never happen through any path other than this route under a verified Super Admin session. */
export async function POST(request: NextRequest, props: RouteContext<"/api/superadmin/organization-registrations/[id]/approve">) {
  try {
    const ctx = await requireRole(request, ["super_admin"]);
    const { id } = await props.params;

    const requestDoc = await approveOrganizationRegistration({ requestId: id, reviewerId: ctx.uid });
    return NextResponse.json({ request: requestDoc });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
