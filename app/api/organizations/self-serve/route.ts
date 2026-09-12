import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { apiErrorResponse, ApiError } from "@/lib/server/api-response";
import { claimNewOrganizationForSelf } from "@/lib/server/organizations";

/**
 * Self-serve organization creation for a first-time Admin — any signed-in
 * account may call this, but only to create a BRAND NEW organization and
 * become its admin. Refuses outright if the caller already belongs to an
 * organization, so this can never spawn a duplicate org for an existing
 * admin/user, and can never be used to take over or join an existing org.
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = await requireAuth(request);
    if (ctx.organizationId) {
      throw new ApiError(409, "Your account is already part of an organization.");
    }
    if (ctx.role === "super_admin") {
      throw new ApiError(409, "Super Admin accounts don't belong to a single organization.");
    }

    const body = await request.json();
    if (typeof body?.name !== "string" || body.name.trim().length < 2) {
      throw new ApiError(400, "Organization name is required.");
    }

    const organization = await claimNewOrganizationForSelf({
      uid: ctx.uid,
      name: body.name,
      description: typeof body.description === "string" ? body.description : undefined,
    });

    return NextResponse.json({ organization }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
