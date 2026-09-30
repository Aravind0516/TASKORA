import { NextResponse, type NextRequest } from "next/server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { requireAuth, requireRole, type AuthedContext } from "@/lib/server/auth";
import { apiErrorResponse, ApiError } from "@/lib/server/api-response";
import { getAdminDb } from "@/lib/firebase/admin";
import { monthKey, weekStartKey } from "@/lib/credits/periods";
import { TOP_PERFORMER_MESSAGE_MAX, type PerformerPeriod, type TopPerformer } from "@/types/top-performer";

/**
 * The organization's admin-published Weekly / Monthly Top Performer.
 *
 * Served through the Admin SDK rather than direct client Firestore access so
 * the feature never depends on a separately deployed firestore.rules
 * release. The same checks the rules express are enforced here, using only
 * the verified token's claims for role and organization:
 *   - GET: any signed-in member reads ONLY their own organization's
 *     recognitions (a super admin may name an organization).
 *   - POST / DELETE: only an Admin of that organization; the featured
 *     person must belong to the same organization; the name/headline shown
 *     to everyone is read from their profile, never taken from the request.
 */

const PERIODS: readonly PerformerPeriod[] = ["weekly", "monthly"];
const docId = (organizationId: string, period: PerformerPeriod) => `${organizationId}_${period}`;

function targetOrganization(ctx: AuthedContext, requested: string | null): string {
  if (ctx.role === "super_admin" && requested) return requested;
  if (!ctx.organizationId) throw new ApiError(403, "You are not part of an organization.");
  if (requested && requested !== ctx.organizationId) throw new ApiError(403, "You can only view your own organization.");
  return ctx.organizationId;
}

function adminOrganization(ctx: AuthedContext): string {
  if (ctx.role !== "admin" || !ctx.organizationId) throw new ApiError(403, "Only your organization's admin can do this.");
  return ctx.organizationId;
}

function parsePeriod(value: unknown): PerformerPeriod {
  if (!PERIODS.includes(value as PerformerPeriod)) throw new ApiError(400, "Choose weekly or monthly.");
  return value as PerformerPeriod;
}

function toPerformer(id: string, data: FirebaseFirestore.DocumentData): TopPerformer {
  const at = data.publishedAt;
  return {
    id,
    organizationId: data.organizationId,
    period: data.period,
    periodKey: data.periodKey,
    userId: data.userId,
    displayName: data.displayName,
    headline: data.headline ?? null,
    message: data.message ?? "",
    publishedBy: data.publishedBy,
    publishedByName: data.publishedByName ?? "",
    publishedAt: at instanceof Timestamp ? at.toDate().toISOString() : typeof at === "string" ? at : new Date().toISOString(),
  };
}

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireAuth(request);
    const organizationId = targetOrganization(ctx, request.nextUrl.searchParams.get("organizationId"));
    const db = getAdminDb();
    const snaps = await db.getAll(...PERIODS.map((p) => db.collection("topPerformers").doc(docId(organizationId, p))));
    const performers = snaps.filter((s) => s.exists).map((s) => toPerformer(s.id, s.data()!));
    return NextResponse.json({ performers });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireRole(request, ["admin"]);
    const organizationId = adminOrganization(ctx);
    const body = await request.json().catch(() => ({}));
    const period = parsePeriod(body?.period);
    const userId = typeof body?.userId === "string" ? body.userId : "";
    const message = typeof body?.message === "string" ? body.message.trim() : "";
    if (!userId) throw new ApiError(400, "Choose a member to recognize.");
    if (message.length > TOP_PERFORMER_MESSAGE_MAX) throw new ApiError(400, `Keep the note under ${TOP_PERFORMER_MESSAGE_MAX} characters.`);

    const db = getAdminDb();
    const [memberSnap, adminSnap] = await Promise.all([db.collection("users").doc(userId).get(), db.collection("users").doc(ctx.uid).get()]);
    const member = memberSnap.data();
    if (!member || member.organizationId !== organizationId) throw new ApiError(403, "That member is not part of your organization.");
    if (member.status === "suspended") throw new ApiError(400, "A suspended member can't be recognized.");

    const displayName = typeof member.name === "string" && member.name.trim() ? member.name.trim() : "Team member";
    const headline = (typeof member.functionalRole === "string" && member.functionalRole) || (typeof member.title === "string" && member.title) || null;
    const record = {
      organizationId,
      period,
      periodKey: period === "weekly" ? weekStartKey() : monthKey(),
      userId,
      displayName,
      headline,
      message,
      publishedBy: ctx.uid,
      publishedByName: (typeof adminSnap.data()?.name === "string" && adminSnap.data()!.name) || ctx.name || "Admin",
    };
    const ref = db.collection("topPerformers").doc(docId(organizationId, period));
    await ref.set({ ...record, publishedAt: FieldValue.serverTimestamp() });
    return NextResponse.json({ performer: toPerformer(ref.id, { ...record, publishedAt: new Date().toISOString() }) });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const ctx = await requireRole(request, ["admin"]);
    const organizationId = adminOrganization(ctx);
    const period = parsePeriod(request.nextUrl.searchParams.get("period"));
    await getAdminDb().collection("topPerformers").doc(docId(organizationId, period)).delete();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
