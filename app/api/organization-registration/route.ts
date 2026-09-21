import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { apiErrorResponse, ApiError } from "@/lib/server/api-response";
import { submitOrganizationRegistration } from "@/lib/server/organization-registrations";

/**
 * Step 2 of "Register a new organization" (replaces the old instant
 * self-serve claim — see app/api/organizations/self-serve/route.ts, still
 * present but no longer called by any UI). Any signed-in, org-less,
 * non-Super-Admin account may submit exactly one request FOR ITSELF — this
 * creates a organizationRegistrationRequests/{id} document only, never an
 * organization, never admin claims. Approval is a separate, Super-Admin-only
 * step (app/api/superadmin/organization-registrations/[id]/approve).
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

    const body = await request.json().catch(() => ({}));
    if (typeof body?.organizationName !== "string" || body.organizationName.trim().length < 2) {
      throw new ApiError(400, "Organization name is required.");
    }

    const requestDoc = await submitOrganizationRegistration({
      uid: ctx.uid,
      // The requester's name/email were already collected when their Firebase
      // account was created (Step 1 of registration) — re-derived here from
      // their own verified ID token claims, never re-asked or client-supplied.
      fullName: ctx.name ?? ctx.email ?? "Organization Owner",
      email: ctx.email ?? "",
      phone: typeof body.phone === "string" ? body.phone : undefined,
      organizationName: body.organizationName.trim(),
      organizationType: typeof body.organizationType === "string" ? body.organizationType : undefined,
      industry: typeof body.industry === "string" ? body.industry : undefined,
      website: typeof body.website === "string" ? body.website : undefined,
      location: typeof body.location === "string" ? body.location : undefined,
      organizationSize: typeof body.organizationSize === "string" ? body.organizationSize : undefined,
      description: typeof body.description === "string" ? body.description : undefined,
    });

    return NextResponse.json({ request: requestDoc }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
