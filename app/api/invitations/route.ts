import { NextResponse, type NextRequest } from "next/server";
import { requireRole } from "@/lib/server/auth";
import { apiErrorResponse, ApiError } from "@/lib/server/api-response";
import { createInvitation, attemptInvitationEmail } from "@/lib/server/invitations";
import { getAdminDb } from "@/lib/firebase/admin";
import { FUNCTIONAL_ROLES, type FunctionalRole } from "@/types/user";

// Dev/demo escape hatch — see .env.example. When true, invitation creation
// does NOT attempt an automatic send (it would predictably fail without a
// verified Resend domain — see lib/server/email.ts). The invitation and its
// secure link are still created in full; the Admin can copy the link, or
// explicitly trigger a real send via "Send Email" (POST /api/invitations/
// [id]/resend, which always attempts for real regardless of this flag).
// Never used to fake a successful send — emailSent is always the honest,
// actual outcome.
const EMAIL_DELIVERY_OPTIONAL = process.env.EMAIL_DELIVERY_OPTIONAL === "true";

/**
 * Creates an invitation. Admins may only invite "user" role members into
 * their own organization; only Super Admin may invite "admin" role members
 * (into any organization) — this is the server-side enforcement PHASE 3/19
 * require; the browser's role/organizationId claims decide what's allowed,
 * never a client-supplied field.
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = await requireRole(request, ["admin", "super_admin"]);
    const body = await request.json();

    const role = body?.role === "admin" ? "admin" : "user";
    if (role === "admin" && ctx.role !== "super_admin") {
      throw new ApiError(403, "Only the platform owner can invite administrators.");
    }

    const organizationId = role === "admin" ? body?.organizationId : ctx.organizationId;
    if (typeof organizationId !== "string" || !organizationId) {
      throw new ApiError(400, "organizationId is required.");
    }
    if (ctx.role === "admin" && organizationId !== ctx.organizationId) {
      throw new ApiError(403, "You can only invite people into your own organization.");
    }

    if (typeof body?.name !== "string" || body.name.trim().length < 2) throw new ApiError(400, "Name is required.");
    if (typeof body?.email !== "string" || !body.email.includes("@")) throw new ApiError(400, "A valid email is required.");

    // Team is optional — a brand-new organization has no teams yet, and a
    // user must be inviteable without one (Admin assigns a team later once
    // teams exist). When a team IS supplied, it must belong to the same
    // organization the invitation is for — never trust a client-supplied
    // teamId across organizations.
    const rawTeamId = role === "user" ? body?.teamId : null;
    const teamId = typeof rawTeamId === "string" && rawTeamId.trim().length > 0 ? rawTeamId : null;
    if (teamId) {
      const teamSnap = await getAdminDb().collection("teams").doc(teamId).get();
      if (!teamSnap.exists || teamSnap.data()?.organizationId !== organizationId) {
        throw new ApiError(400, "Selected team does not belong to your organization.");
      }
    }

    // Functional role (what they'll do, e.g. "Frontend Developer") is
    // separate from `role` (system access) — optional, and only meaningful
    // for a "user" invite. Validated against the fixed list so a stray or
    // spoofed value never lands in Firestore.
    const rawFunctionalRole = role === "user" ? body?.functionalRole : null;
    const functionalRole: FunctionalRole | null =
      typeof rawFunctionalRole === "string" && (FUNCTIONAL_ROLES as readonly string[]).includes(rawFunctionalRole)
        ? (rawFunctionalRole as FunctionalRole)
        : null;

    const { invitation, rawToken } = await createInvitation({
      organizationId,
      invitedBy: ctx.uid,
      email: body.email,
      name: body.name,
      role,
      teamId,
      functionalRole,
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin;
    const invitationUrl = `${appUrl}/invite/${rawToken}`;

    const { emailSent, emailError } = EMAIL_DELIVERY_OPTIONAL
      ? { emailSent: false, emailError: "Email delivery is unavailable in this environment. Copy the invitation link instead." }
      : await attemptInvitationEmail({
          invitationId: invitation.id,
          email: invitation.email,
          name: invitation.name,
          role,
          teamId,
          organizationId,
          expiresAt: invitation.expiresAt,
          invitationUrl,
          inviterName: ctx.name ?? ctx.email ?? "An administrator",
        });

    return NextResponse.json(
      { invitation: { ...invitation, tokenHash: undefined, emailSent }, invitationUrl, emailSent, emailError },
      { status: 201 }
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}
