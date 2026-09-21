import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { writeNotification } from "@/lib/server/notifications";
import { CREDIT_CATEGORY_LABELS, type CreditCategory, type CreditSourceType } from "@/types/credit";

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
 * Deterministic transaction document id. Scoped by organizationId as well
 * as userId/category/sourceId — per Phase 5 of this pass's request, this is
 * the "organizationId + userId + sourceType + category + sourceId" scheme
 * (sourceType folded in implicitly: the same sourceId under a different
 * category is a different id already, and categories are already
 * source-type-specific in practice) — closing the theoretical gap where a
 * client-supplied sourceId string alone (e.g. free-text like "In Time
 * Project Submission" typed into the admin dialog's Reference field) could
 * never collide with another organization's or another category's award,
 * even though sourceId itself is caller-chosen free text, not a real
 * document id.
 */
export function creditTransactionId(organizationId: string, userId: string, category: CreditCategory, sourceId: string | null): string {
  return sourceId ? `${organizationId}_${userId}_${category}_${sourceId}` : `${organizationId}_${userId}_${category}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

/**
 * The one, audited way credits ever change, now run exclusively server-side.
 * Throws DuplicateCreditAwardError (never a generic permission error) if
 * this exact source has already been credited for this category.
 */
export async function awardCredit(input: CreditAwardInput): Promise<void> {
  const db = getAdminDb();
  const txRef = db.collection("creditTransactions").doc(creditTransactionId(input.organizationId, input.userId, input.category, input.sourceId));
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

  if (!awarded) throw new DuplicateCreditAwardError();

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
