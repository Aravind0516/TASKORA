import { NextResponse, type NextRequest } from "next/server";
import { requireRole } from "@/lib/server/auth";
import { apiErrorResponse, ApiError } from "@/lib/server/api-response";
import { createSubscriptionRequest } from "@/lib/server/subscriptions";

/**
 * ORG_ADMIN requests a paid plan for their own organization — organizationId
 * always comes from the caller's verified claims (ctx.organizationId), NEVER
 * from the request body, so an admin can never submit a request that claims
 * to be for a different organization. Manager/employee roles can't reach
 * this at all (requireRole below), matching "only ORG_ADMIN can request a
 * plan."
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = await requireRole(request, ["admin"]);
    if (!ctx.organizationId) throw new ApiError(409, "Your account is not assigned to an organization yet.");

    const body = await request.json();
    if (body?.requestedPlan !== "PREMIUM" && body?.requestedPlan !== "CRAZY") {
      throw new ApiError(400, "Invalid plan requested.");
    }

    const requestDoc = await createSubscriptionRequest({
      organizationId: ctx.organizationId,
      requestedBy: ctx.uid,
      requestedByEmail: ctx.email ?? "",
      requestedByName: ctx.name ?? ctx.email ?? "Organization Admin",
      requestedPlan: body.requestedPlan,
    });

    return NextResponse.json({ request: requestDoc }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
