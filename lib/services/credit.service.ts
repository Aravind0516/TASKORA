import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { getFirestoreErrorMessage } from "@/lib/firebase/firestore-errors";
import { toIso } from "@/lib/firebase/timestamp";
import { apiFetch } from "@/lib/api-client";
import {
  DEFAULT_CREDIT_WEIGHTS,
  type CreditCategory,
  type CreditRules,
  type CreditSourceType,
  type CreditTransaction,
  type LeaderboardEntry,
  creditEntryTypeForAmount,
} from "@/types/credit";

function creditRulesFromDoc(organizationId: string, data: Record<string, unknown> | undefined): CreditRules {
  const weights = (data?.weights as Record<CreditCategory, number> | undefined) ?? DEFAULT_CREDIT_WEIGHTS;
  return {
    organizationId,
    weights,
    totalTarget: Object.values(weights).reduce((sum, v) => sum + v, 0),
    updatedAt: data?.updatedAt ? toIso(data.updatedAt) : "",
    updatedBy: (data?.updatedBy as string | undefined) ?? null,
  };
}

/** Falls back to DEFAULT_CREDIT_WEIGHTS (never a hard failure) until an Admin has ever saved rules for this organization — so every credit calculation always has real weights to divide by. */
export function subscribeToCreditRules(
  organizationId: string,
  onData: (rules: CreditRules) => void,
  onError: (message: string) => void
): () => void {
  return onSnapshot(
    doc(db, "creditRules", organizationId),
    (snap) => onData(creditRulesFromDoc(organizationId, snap.exists() ? snap.data() : undefined)),
    (error) => onError(getFirestoreErrorMessage(error, "creditRules"))
  );
}

/**
 * Admin-only (see firestore.rules). Never rewrites historical transactions —
 * each creditTransactions doc stores the credits it actually awarded at
 * award time, independent of whatever the rules say later.
 */
export async function updateCreditRules(organizationId: string, weights: Record<CreditCategory, number>, updatedBy: string): Promise<void> {
  try {
    await setDoc(doc(db, "creditRules", organizationId), { organizationId, weights, updatedBy, updatedAt: serverTimestamp() }, { merge: true });
  } catch (error) {
    throw new Error(getFirestoreErrorMessage(error, "creditRules:update"));
  }
}

function transactionFromDoc(docSnap: QueryDocumentSnapshot): CreditTransaction {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    organizationId: data.organizationId,
    userId: data.userId,
    candidateId: data.candidateId ?? null,
    category: data.category,
    credits: data.credits,
    entryType: data.entryType === "DEDUCTION" || data.entryType === "AWARD" ? data.entryType : creditEntryTypeForAmount(data.credits),
    status: data.status ?? "VERIFIED",
    sourceType: data.sourceType,
    sourceId: data.sourceId ?? null,
    action: data.action,
    reason: data.reason,
    awardedBy: data.awardedBy,
    createdAt: toIso(data.createdAt),
  };
}

/** One candidate's own credit history — used by both "My Credits" (self) and an Admin/Manager viewing a specific candidate's history; firestore.rules decides who's actually allowed to read it, this is just the query shape. */
export function subscribeToUserCreditTransactions(
  userId: string,
  onData: (transactions: CreditTransaction[]) => void,
  onError: (message: string) => void
): () => void {
  const q = query(collection(db, "creditTransactions"), where("userId", "==", userId), orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    (snapshot) => onData(snapshot.docs.map(transactionFromDoc)),
    (error) => onError(getFirestoreErrorMessage(error, "creditTransactions:user"))
  );
}

/** Org-wide credit feed for the Admin "Credit Management" page — Admin/Super Admin only per firestore.rules (the same read rule subscribeToUserCreditTransactions relies on). */
export function subscribeToOrgCreditTransactions(
  organizationId: string,
  onData: (transactions: CreditTransaction[]) => void,
  onError: (message: string) => void
): () => void {
  const q = query(collection(db, "creditTransactions"), where("organizationId", "==", organizationId), orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    (snapshot) => onData(snapshot.docs.map(transactionFromDoc)),
    (error) => onError(getFirestoreErrorMessage(error, "creditTransactions:org"))
  );
}

function mondayOf(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** "YYYY-MM-DD" of the Monday starting the current week, in the caller's local time — same "caller-local, not a stored org timezone" convention lib/services/daily-work-update.service.ts's todayDateKey() already established; no organizations.timezone field exists to read instead. */
export function currentWeekStartKey(date = new Date()): string {
  const monday = mondayOf(date);
  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, "0")}-${String(monday.getDate()).padStart(2, "0")}`;
}

export function currentMonthKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export interface AwardCreditInput {
  organizationId: string;
  userId: string;
  candidateId: string | null;
  /** First name + last-initial only — see types/credit.ts's safeDisplayName(); never the candidate's full profile. Ignored by the server (it re-derives this from the recipient's real user doc) — kept in the input shape only so call sites don't need to change. */
  displayName: string;
  category: CreditCategory;
  credits: number;
  sourceType: CreditSourceType;
  /** When present, used server-side to build a deterministic transaction id so the SAME source can never be credited twice for the SAME category. */
  sourceId: string | null;
  action: string;
  reason: string;
  awardedBy: string;
  /** Idempotency key for this one submission — reuse it when retrying the same submission, generate a new one for the next. */
  requestId: string;
}

/**
 * The one, audited way credits ever change — routed entirely through the
 * Admin SDK (see app/api/credits/award/route.ts + lib/server/credits.ts),
 * never a direct client Firestore write. This used to run the read-then-
 * write transaction through the CLIENT SDK directly against
 * creditTransactions/leaderboardStats; that was broken by construction
 * (verified live): firestore.rules' read rules for both collections depend
 * on resource.data.*, and Firestore denies a get() on a document that
 * doesn't exist yet — which is exactly the first-ever award for any
 * candidate. Moving this server-side also closes the actual security gap
 * the architecture was supposed to prevent in the first place: the browser
 * can never send an arbitrary {credits: 500} payload and have it accepted,
 * because firestore.rules now denies ALL direct client writes to both
 * collections (see firestore.rules) — this route is the only path.
 */
export async function awardCredit(input: AwardCreditInput): Promise<void> {
  await apiFetch("/api/credits/award", {
    method: "POST",
    body: JSON.stringify({
      organizationId: input.organizationId,
      userId: input.userId,
      category: input.category,
      credits: input.credits,
      sourceId: input.sourceId,
      reason: input.reason,
      requestId: input.requestId,
    }),
  });
}

function leaderboardFromDoc(docSnap: QueryDocumentSnapshot): LeaderboardEntry {
  const data = docSnap.data();
  return {
    uid: docSnap.id,
    organizationId: data.organizationId,
    candidateId: data.candidateId ?? null,
    displayName: data.displayName,
    lifetimeCredits: data.lifetimeCredits ?? 0,
    weeklyCredits: data.weekStartDate === currentWeekStartKey() ? data.weeklyCredits ?? 0 : 0,
    weekStartDate: data.weekStartDate ?? currentWeekStartKey(),
    monthlyCredits: data.monthKey === currentMonthKey() ? data.monthlyCredits ?? 0 : 0,
    monthKey: data.monthKey ?? currentMonthKey(),
    updatedAt: toIso(data.updatedAt),
  };
}

/**
 * Org-wide — the ONLY credit data every member (not just Admin) may read;
 * see firestore.rules' leaderboardStats read rule. Contains nothing beyond
 * a safe display name and three numbers — no reason, no category, no
 * profile fields. A stored weekly/monthly total from a PAST week/month
 * (stale because nothing has re-awarded this candidate since) is
 * normalized to 0 here rather than shown as an inflated leftover number.
 */
export function subscribeToLeaderboard(
  organizationId: string,
  onData: (entries: LeaderboardEntry[]) => void,
  onError: (message: string) => void
): () => void {
  const q = query(collection(db, "leaderboardStats"), where("organizationId", "==", organizationId));
  return onSnapshot(
    q,
    (snapshot) => onData(snapshot.docs.map(leaderboardFromDoc)),
    (error) => onError(getFirestoreErrorMessage(error, "leaderboardStats"))
  );
}

/**
 * Single entry — used to show "my rank" context without subscribing to the
 * whole org's aggregate when only one row is needed. A candidate with no
 * credits yet has no leaderboardStats document at all — and since that
 * collection's read rule depends on resource.data.organizationId, a get()
 * on a NONEXISTENT document is denied by Firestore itself (resource is
 * null, so no resource-data-dependent rule branch can be proven true),
 * verified live. That denial means exactly the same thing a "not found"
 * would here — "this person has no leaderboard data yet" — so it's treated
 * as null rather than surfaced as an error.
 */
export async function getLeaderboardEntry(uid: string): Promise<LeaderboardEntry | null> {
  try {
    const snap = await getDoc(doc(db, "leaderboardStats", uid));
    return snap.exists() ? leaderboardFromDoc(snap as QueryDocumentSnapshot) : null;
  } catch (error) {
    if (error instanceof Error && "code" in error && (error as { code?: string }).code === "permission-denied") return null;
    throw new Error(getFirestoreErrorMessage(error, "leaderboardStats:one"));
  }
}
