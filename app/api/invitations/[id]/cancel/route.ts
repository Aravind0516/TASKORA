import { NextResponse, type NextRequest } from "next/server";
import { requireRole } from "@/lib/server/auth";
import { apiErrorResponse, ApiError } from "@/lib/server/api-response";
import { cancelInvitation } from "@/lib/server/invitations";
import { getAdminDb } from "@/lib/firebase/admin";

export async function POST(request: NextRequest, props: RouteContext<"/api/invitations/[id]/cancel">) {
  try {
    const ctx = await requireRole(request, ["admin", "super_admin"]);
    const { id } = await props.params;

    const db = getAdminDb();
    const existing = await db.collection("invitations").doc(id).get();
    if (!existing.exists) throw new ApiError(404, "Invitation not found.");
    const orgId = existing.data()?.organizationId as string;
    if (ctx.role === "admin" && orgId !== ctx.organizationId) throw new ApiError(403, "This invitation belongs to a different organization.");

    await cancelInvitation(id, orgId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
