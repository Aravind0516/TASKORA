import { NextResponse, type NextRequest } from "next/server";
import { apiErrorResponse } from "@/lib/server/api-response";
import { getPublicInvitationView } from "@/lib/server/invitations";

// Public, unauthenticated — the /invite/[token] acceptance page's own
// validation call. Only ever returns the safe subset (PublicInvitationView):
// no tokenHash, no invitedBy uid, no invitation id.
export async function GET(_request: NextRequest, props: RouteContext<"/api/invitations/token/[token]">) {
  try {
    const { token } = await props.params;
    const view = await getPublicInvitationView(token);
    return NextResponse.json({ invitation: view });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
