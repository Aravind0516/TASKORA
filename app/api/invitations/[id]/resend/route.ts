import { NextResponse, type NextRequest } from "next/server";
import { requireRole } from "@/lib/server/auth";
import { apiErrorResponse, ApiError } from "@/lib/server/api-response";
import { resendInvitation, attemptInvitationEmail } from "@/lib/server/invitations";
import { getAdminDb } from "@/lib/firebase/admin";

/**
 * The explicit "Send Email" action — always attempts a REAL send, regardless
 * of EMAIL_DELIVERY_OPTIONAL (that flag only skips the *automatic* attempt
 * at invitation creation; see app/api/invitations/route.ts). This is a
 * deliberate Admin action, so it always gives the real, honest outcome —
 * useful for retrying after a transient failure, or once a Resend domain is
 * verified.
 */
export async function POST(request: NextRequest, props: RouteContext<"/api/invitations/[id]/resend">) {
  try {
    const ctx = await requireRole(request, ["admin", "super_admin"]);
    const { id } = await props.params;

    const organizationId = ctx.organizationId;
    if (ctx.role === "admin" && !organizationId) throw new ApiError(403, "You're not assigned to an organization.");

    const db = getAdminDb();
    const existing = await db.collection("invitations").doc(id).get();
    if (!existing.exists) throw new ApiError(404, "Invitation not found.");
    const orgId = existing.data()?.organizationId as string;
    if (ctx.role === "admin" && orgId !== organizationId) throw new ApiError(403, "This invitation belongs to a different organization.");

    const { invitation, rawToken } = await resendInvitation(id, orgId);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin;
    const invitationUrl = `${appUrl}/invite/${rawToken}`;

    const { emailSent, emailError } = await attemptInvitationEmail({
      invitationId: invitation.id,
      email: invitation.email,
      name: invitation.name,
      role: invitation.role,
      teamId: invitation.teamId,
      organizationId: orgId,
      expiresAt: invitation.expiresAt,
      invitationUrl,
      inviterName: ctx.name ?? ctx.email ?? "An administrator",
    });

    return NextResponse.json({ invitation: { ...invitation, tokenHash: undefined, emailSent }, invitationUrl, emailSent, emailError });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
