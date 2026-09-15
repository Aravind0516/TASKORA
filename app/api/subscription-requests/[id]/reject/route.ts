import { NextResponse, type NextRequest } from "next/server";
import { requireRole } from "@/lib/server/auth";
import { apiErrorResponse } from "@/lib/server/api-response";
import { rejectSubscriptionRequest } from "@/lib/server/subscriptions";

/** SUPER_ADMIN only — same enforcement shape as approve/route.ts. */
export async function POST(request: NextRequest, props: RouteContext<"/api/subscription-requests/[id]/reject">) {
  try {
    const ctx = await requireRole(request, ["super_admin"]);
    const { id } = await props.params;
    const body = await request.json().catch(() => ({}));
    const rejectionReason = typeof body?.rejectionReason === "string" ? body.rejectionReason.slice(0, 300) : undefined;

    const requestDoc = await rejectSubscriptionRequest({ requestId: id, reviewerId: ctx.uid, rejectionReason });
    return NextResponse.json({ request: requestDoc });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
