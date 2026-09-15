import { NextResponse, type NextRequest } from "next/server";
import { requireRole } from "@/lib/server/auth";
import { apiErrorResponse } from "@/lib/server/api-response";
import { approveSubscriptionRequest } from "@/lib/server/subscriptions";

/** SUPER_ADMIN only — enforced here (requireRole) AND independently by firestore.rules' `subscriptionRequests` block denying every client write, so approval can never happen through any path other than this route under a verified Super Admin session. */
export async function POST(request: NextRequest, props: RouteContext<"/api/subscription-requests/[id]/approve">) {
  try {
    const ctx = await requireRole(request, ["super_admin"]);
    const { id } = await props.params;

    const requestDoc = await approveSubscriptionRequest({ requestId: id, reviewerId: ctx.uid });
    return NextResponse.json({ request: requestDoc });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
