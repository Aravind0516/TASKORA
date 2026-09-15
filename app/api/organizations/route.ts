import { NextResponse, type NextRequest } from "next/server";
import { requireRole } from "@/lib/server/auth";
import { apiErrorResponse, ApiError } from "@/lib/server/api-response";
import { createOrganization } from "@/lib/server/organizations";

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireRole(request, ["super_admin"]);
    const body = await request.json();

    if (typeof body?.name !== "string" || body.name.trim().length < 2) {
      throw new ApiError(400, "Organization name is required.");
    }

    const organization = await createOrganization({
      name: body.name,
      description: typeof body.description === "string" ? body.description : "",
      industry: typeof body.industry === "string" ? body.industry : undefined,
      contactEmail: typeof body.contactEmail === "string" ? body.contactEmail : undefined,
      createdBy: ctx.uid,
    });

    return NextResponse.json({ organization }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
