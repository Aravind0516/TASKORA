import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { writeNotification } from "@/lib/server/notifications";
import { CREDIT_CATEGORY_LABELS, creditEntryTypeForAmount, type CreditCategory, type CreditSourceType } from "@/types/credit";

// THE centralized credit-award service (Phase 2/16 of this pass's request).
// Runs exclusively via the Admin SDK — never callable from the browser with
// an arbitrary {credits: 500} payload. This replaces the OLD client-side
// implementation in lib/services/credit.service.ts, which used to run this
// exact same read-then-write transaction through the CLIENT Firestore SDK.
// That was broken by construction: firestore.rules' read rules for both
// creditTransactions/{id} and leaderboardStats/{uid} depend on
// resource.data.* fields, and Firestore denies a get() on a document that
// doesn't exist yet (resource is null, so no resource-data-dependent branch
// can ever be true) — which is exactly the FIRST-EVER award for any
// candidate, the overwhelmingly common case. Verified live: an org admin's
// own getDoc() on a not-yet-created creditTransactions/{id} was denied
// outright. Running this same transaction via the Admin SDK sidesteps rule
// evaluation entirely (by design — Admin SDK is the trusted server), so the
// pre-read works correctly, and firestore.rules can now safely deny ALL
// direct client writes to both collections (see firestore.rules — this is a
// strengthening, not a weakening).

export interface CreditAwardInput {
  organizationId: string;
  userId: string;
  candidateId: string | null;
  /** Full name — reduced to "First L." internally before ever being written to the broadcast-safe leaderboardStats aggregate; see types/credit.ts's safeDisplayName(). */
  displayName: string;
  category: CreditCategory;
  /** Positive to award, negative for a deduction — never silently overwritten, always a new ledger row. */
  credits: number;
  sourceType: CreditSourceType;
  /** Deterministic anti-duplication key when present (e.g. a project id) — see reference below for how the actual transaction id is derived. */
  sourceId: string | null;
  action: string;
  reason: string;
  awardedBy: string;
  /**
   * Client-generated idempotency key for ONE submission of the manual
   * Award/Deduct dialog (reused on retry of that same submission, fresh for
   * the next one). Makes a retried request resolve to the same ledger row
   * instead of a second one. Required for deductions (see
   * creditTransactionId); optional for awards.
   */
  requestId?: string | null;
  /** Set true to skip the recipient notification (used by callers that send their own combined notification, e.g. project submission awarding two categories at once). */
  skipNotification?: boolean;
}

export class DuplicateCreditAwardError extends Error {
  constructor() {
    super("Credits have already been awarded for this item.");
  }
}

function mondayOf(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1) - day);
  d.setHours(0, 0, 0, 0);
  return d;
}
export function currentWeekStartKey(date = new Date()): string {
  const m = mondayOf(date);
  return `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, "0")}-${String(m.getDate()).padStart(2, "0")}`;
}
export function currentMonthKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Deterministic transaction document id — the ledger's duplicate-prevention
 * mechanism (a transaction whose id already exists is never written twice).
 *
 *   AWARD with a reference   {org}_{user}_{category}_{sourceId}
 *       Unchanged from the original scheme, so every award already in the
 *       ledger still blocks a second award for the same item ("the same
 *       category + reference can only be credited once").
 *   AWARD without a reference  {org}_{user}_{category}_req_{requestId}
 *   DEDUCTION                  {org}_{user}_{category}_DEDUCTION_{requestId}
 *       Its own namespace, so a deduction can never collide with the award
 *       for the same source (the old scheme gave a -50 deduction referencing
 *       "Project X" the SAME id as the +100 award for "Project X", so it was
 *       rejected as "already awarded"). Keyed by the per-submission
 *       requestId: a retry of the same request is idempotent, while a
 *       separate, deliberate deduction against the same source is a new,
 *       separately-reasoned ledger event, as it should be.
 *
 * Without a requestId (server-side automations only) the id falls back to a
 * unique random suffix, exactly as before.
 */
export function creditTransactionId(
  organizationId: string,
  userId: string,
  category: CreditCategory,
  sourceId: string | null,
  credits: number,
  requestId?: string | null
): string {
  const base = `${organizationId}_${userId}_${category}`;
  const unique = requestId ? requestId : `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  if (creditEntryTypeForAmount(credits) === "DEDUCTION") return `${base}_DEDUCTION_${unique}`;
  if (sourceId) return `${base}_${sourceId}`;
  return `${base}_req_${unique}`;
}

/**
 * The one, audited way credits ever change, now run exclusively server-side.
 * Throws DuplicateCreditAwardError (never a generic permission error) if
 * this exact source has already been credited for this category.
 */
export async function awardCredit(input: CreditAwardInput): Promise<void> {
  const db = getAdminDb();
  const txRef = db
    .collection("creditTransactions")
    .doc(creditTransactionId(input.organizationId, input.userId, input.category, input.sourceId, input.credits, input.requestId));
  const statsRef = db.collection("leaderboardStats").doc(input.userId);
  const weekKey = currentWeekStartKey();
  const monthKey = currentMonthKey();

  const awarded = await db.runTransaction(async (tx) => {
    const [existingTx, statsSnap] = await Promise.all([tx.get(txRef), tx.get(statsRef)]);
    if (existingTx.exists) return false;

    const stats = statsSnap.data();
    const prevLifetime = (stats?.lifetimeCredits as number | undefined) ?? 0;
    const prevWeekly = stats?.weekStartDate === weekKey ? ((stats?.weeklyCredits as number | undefined) ?? 0) : 0;
    const prevMonthly = stats?.monthKey === monthKey ? ((stats?.monthlyCredits as number | undefined) ?? 0) : 0;

    tx.set(txRef, {
      organizationId: input.organizationId,
      userId: input.userId,
      candidateId: input.candidateId,
      category: input.category,
      credits: input.credits,
      // Explicit, so history never has to infer "award vs deduction" from
      // anything but the ledger row itself (older rows without it are
      // classified by the sign of `credits` — see types/credit.ts).
      entryType: creditEntryTypeForAmount(input.credits),
      status: "VERIFIED",
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      action: input.action,
      reason: input.reason,
      awardedBy: input.awardedBy,
      createdAt: FieldValue.serverTimestamp(),
    });
    tx.set(
      statsRef,
      {
        uid: input.userId,
        organizationId: input.organizationId,
        candidateId: input.candidateId,
        displayName: input.displayName,
        lifetimeCredits: prevLifetime + input.credits,
        weeklyCredits: prevWeekly + input.credits,
        weekStartDate: weekKey,
        monthlyCredits: prevMonthly + input.credits,
        monthKey,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    return true;
  });

  if (!awarded) {
    // A request-keyed row that already exists is THIS request being replayed
    // (a retry after a dropped response) — it was already applied exactly
    // once, so report success without writing or notifying again. Only a
    // reference-keyed award (same item credited twice) is a real duplicate.
    const isReferenceKeyedAward = creditEntryTypeForAmount(input.credits) === "AWARD" && Boolean(input.sourceId);
    if (input.requestId && !isReferenceKeyedAward) return;
    throw new DuplicateCreditAwardError();
  }

  if (!input.skipNotification) {
    const isDeduction = input.credits < 0;
    await writeNotification({
      userId: input.userId,
      organizationId: input.organizationId,
      actorId: input.awardedBy,
      type: isDeduction ? "credit_deducted" : "credit_awarded",
      title: isDeduction ? "Credits deducted" : "Credits awarded",
      message: `${isDeduction ? "" : "+"}${input.credits} — ${CREDIT_CATEGORY_LABELS[input.category]}. Reason: ${input.reason}`,
      href: "/credits",
    });
  }
}
