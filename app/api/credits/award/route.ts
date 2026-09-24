import { NextResponse, type NextRequest } from "next/server";
import { requireRole } from "@/lib/server/auth";
import { apiErrorResponse, ApiError } from "@/lib/server/api-response";
import { getAdminDb } from "@/lib/firebase/admin";
import { awardCredit, DuplicateCreditAwardError } from "@/lib/server/credits";
import { CREDIT_CATEGORIES, CREDIT_CATEGORY_LABELS, safeDisplayName, type CreditCategory } from "@/types/credit";

/**
 * The ONLY way a credit transaction is ever created from the browser —
 * Admin/Super Admin only, and the browser can never supply an arbitrary
 * recipient's display data or bypass the "never self-award" check, because
 * this route re-derives the recipient's real name/Candidate ID/organization
 * from Firestore itself (via the Admin SDK) rather than trusting whatever
 * the client happened to send.
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = await requireRole(request, ["admin", "super_admin"]);
    const body = await request.json().catch(() => ({}));

    const organizationId = typeof body?.organizationId === "string" ? body.organizationId : null;
    const userId = typeof body?.userId === "string" ? body.userId : null;
    const category = body?.category;
    const credits = Number(body?.credits);
    const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
    const sourceId = typeof body?.sourceId === "string" && body.sourceId.trim() ? body.sourceId.trim() : null;
    const requestId = typeof body?.requestId === "string" ? body.requestId.trim() : "";

    if (!organizationId) throw new ApiError(400, "organizationId is required.");
    if (!userId) throw new ApiError(400, "userId is required.");
    if (!(CREDIT_CATEGORIES as readonly string[]).includes(category)) throw new ApiError(400, "Invalid credit category.");
    if (!Number.isFinite(credits) || credits === 0) throw new ApiError(400, "Enter a non-zero credit amount.");
    if (!reason) throw new ApiError(400, "A reason is required for every credit adjustment.");
    // The idempotency key becomes part of a document id — restrict it to a
    // safe, bounded charset rather than trusting arbitrary client text.
    if (requestId && !/^[A-Za-z0-9_-]{8,64}$/.test(requestId)) throw new ApiError(400, "Invalid request id.");
    if (credits < 0 && !requestId) throw new ApiError(400, "A request id is required for a credit deduction.");
    if (userId === ctx.uid) throw new ApiError(403, "You cannot award or deduct your own credits.");

    if (ctx.role === "admin" && organizationId !== ctx.organizationId) {
      throw new ApiError(403, "You can only manage credits within your own organization.");
    }

    const userSnap = await getAdminDb().collection("users").doc(userId).get();
    if (!userSnap.exists) throw new ApiError(404, "Candidate not found.");
    const userData = userSnap.data()!;
    if (userData.organizationId !== organizationId) {
      throw new ApiError(403, "This candidate does not belong to the specified organization.");
    }

    const typedCategory = category as CreditCategory;
    const action = `${CREDIT_CATEGORY_LABELS[typedCategory]}${sourceId ? ` — ${sourceId}` : ""}`;

    try {
      await awardCredit({
        organizationId,
        userId,
        candidateId: userData.userId ?? null,
        displayName: safeDisplayName(userData.name ?? "Candidate"),
        category: typedCategory,
        credits,
        sourceType: "MANUAL",
        sourceId,
        action,
        reason,
        awardedBy: ctx.uid,
        requestId: requestId || null,
      });
    } catch (error) {
      if (error instanceof DuplicateCreditAwardError) throw new ApiError(409, error.message);
      throw error;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
