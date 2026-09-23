import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { getFirestoreErrorMessage } from "@/lib/firebase/firestore-errors";
import { toIso } from "@/lib/firebase/timestamp";
import type { DailyUpdateStatus, DailyWorkUpdate, WorkEvidence } from "@/types/daily-work-update";

// Direct client writes under firestore.rules' dailyWorkUpdates block — the
// same pattern tasks/comments/subtasks already use, NOT a privileged
// Admin-SDK route (unlike the subscription-request flow, there is no
// platform-wide/cross-organization approval step here — a project's own
// Admin or assigned manager reviewing their own org's work fits the
// existing "manager-scoped write" shape tasks already have via
// isManagerOfProject(), so no new server-side path was needed).

/** "YYYY-MM-DD" in the caller's local time zone — call only from an event handler, never a component render body (see CLAUDE.md's nowIso() rule). */
export function todayDateKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Deterministic id — one update per user per project per day by construction, not by a duplicate-detection query. */
function updateDocId(projectId: string, userId: string, date: string): string {
  return `${projectId}_${userId}_${date}`;
}

function updateFromDoc(docSnap: QueryDocumentSnapshot): DailyWorkUpdate {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    organizationId: data.organizationId,
    projectId: data.projectId,
    taskId: data.taskId ?? null,
    userId: data.userId,
    date: data.date,
    workSummary: data.workSummary,
    completedWork: data.completedWork,
    blockers: data.blockers ?? "",
    tomorrowPlan: data.tomorrowPlan ?? "",
    evidence: (data.evidence ?? []) as WorkEvidence[],
    status: data.status,
    submittedAt: toIso(data.submittedAt),
    reviewedAt: data.reviewedAt ? toIso(data.reviewedAt) : null,
    reviewedBy: data.reviewedBy ?? null,
    reviewerComment: data.reviewerComment ?? null,
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
  };
}

/** A signed-in member's own updates across every project — powers their personal history/feedback view. */
export function subscribeToMyDailyUpdates(
  userId: string,
  onData: (updates: DailyWorkUpdate[]) => void,
  onError: (message: string) => void
): () => void {
  const q = query(collection(db, "dailyWorkUpdates"), where("userId", "==", userId), orderBy("date", "desc"));
  return onSnapshot(
    q,
    (snapshot) => onData(snapshot.docs.map(updateFromDoc)),
    (error) => onError(getFirestoreErrorMessage(error, "dailyWorkUpdates"))
  );
}

/**
 * Every update submitted for one project, across every member — powers the
 * manager's Work Verification dashboard. Reviewer-only (that project's
 * assigned manager, that org's Admin, or Super Admin): firestore.rules'
 * read rule for a non-reviewer only ever provides isSelf(resource.data.userId),
 * which a query with no userId filter can never let Firestore prove — so a
 * plain member calling this exact query is correctly denied outright, not
 * silently filtered. organizationId is an explicit filter (alongside
 * projectId) specifically so the isAdminOfOrg() branch is provable too, not
 * just isManagerOfProject() — verified live: before this fix, an Org Admin
 * was ALSO denied by this query, only the project's own manager happened to
 * pass (isManagerOfProject(resource.data.projectId) doesn't need
 * organizationId pinned at all). A plain member must use
 * subscribeToMyProjectDailyUpdates instead.
 */
export function subscribeToProjectDailyUpdates(
  organizationId: string,
  projectId: string,
  onData: (updates: DailyWorkUpdate[]) => void,
  onError: (message: string) => void
): () => void {
  const q = query(
    collection(db, "dailyWorkUpdates"),
    where("organizationId", "==", organizationId),
    where("projectId", "==", projectId),
    orderBy("date", "desc")
  );
  return onSnapshot(
    q,
    (snapshot) => onData(snapshot.docs.map(updateFromDoc)),
    (error) => onError(getFirestoreErrorMessage(error, "dailyWorkUpdates:project"))
  );
}

/**
 * A plain member's OWN updates on one project — what DailyUpdatePanel
 * actually needs (today's update + recent history), scoped so
 * firestore.rules' isSelf(resource.data.userId) branch is provable: userId
 * is pinned to the caller's own uid, exactly like organizationId/projectId
 * are pinned above. Used by anyone (including a reviewer, who ALSO has
 * their own daily updates to see on the same panel) — reviewers
 * additionally get subscribeToProjectDailyUpdates for the review dashboard.
 */
export function subscribeToMyProjectDailyUpdates(
  organizationId: string,
  projectId: string,
  userId: string,
  onData: (updates: DailyWorkUpdate[]) => void,
  onError: (message: string) => void
): () => void {
  const q = query(
    collection(db, "dailyWorkUpdates"),
    where("organizationId", "==", organizationId),
    where("projectId", "==", projectId),
    where("userId", "==", userId),
    orderBy("date", "desc")
  );
  return onSnapshot(
    q,
    (snapshot) => onData(snapshot.docs.map(updateFromDoc)),
    (error) => onError(getFirestoreErrorMessage(error, "dailyWorkUpdates:myProject"))
  );
}

/**
 * Every update submitted anywhere in one organization, across every
 * project — powers the Admin Daily Work Update center (/admin/work-
 * verification) and the Admin Dashboard's Daily Work Updates summary.
 * ADMIN/SUPER_ADMIN ONLY: firestore.rules' dailyWorkUpdates read rule only
 * provides isAdminOfOrg(resource.data.organizationId) for a non-reviewer,
 * non-self document with no projectId filter, so a plain member or a
 * project manager calling this exact query would be denied outright — they
 * must keep using subscribeToProjectDailyUpdates (manager) or
 * subscribeToMyDailyUpdates/subscribeToMyProjectDailyUpdates (member).
 * Never call this from a component reachable by a manager or plain member.
 *
 * A single indexed query (organizationId + date, see firestore.indexes.json)
 * replaces the previous "fan out one listener per project" approach the
 * admin Work Verification page used — one listener instead of N, and no
 * risk of missing updates on a project the admin's project list hasn't
 * loaded yet. `limitCount` bounds the read instead of pulling the entire
 * organization's history (see CLAUDE.md's "no unnecessary expensive reads");
 * every dashboard/summary use of this data only ever needs "recent," never
 * "all time."
 */
export function subscribeToOrgDailyUpdates(
  organizationId: string,
  onData: (updates: DailyWorkUpdate[]) => void,
  onError: (message: string) => void,
  limitCount = 500
): () => void {
  const q = query(
    collection(db, "dailyWorkUpdates"),
    where("organizationId", "==", organizationId),
    orderBy("date", "desc"),
    limit(limitCount)
  );
  return onSnapshot(
    q,
    (snapshot) => onData(snapshot.docs.map(updateFromDoc)),
    (error) => onError(getFirestoreErrorMessage(error, "dailyWorkUpdates:org"))
  );
}

export interface DailyUpdateInput {
  organizationId: string;
  projectId: string;
  taskId?: string | null;
  userId: string;
  date: string;
  workSummary: string;
  completedWork: string;
  blockers?: string;
  tomorrowPlan?: string;
  evidence: WorkEvidence[];
}

/** First submission of the day — fails (permission-denied) if one already exists, by firestore.rules' create-time checks; the UI decides create vs. edit by whether today's update already loaded, same convention as every record-editing dialog in this app. */
export async function createDailyUpdate(input: DailyUpdateInput): Promise<void> {
  try {
    const ref = doc(db, "dailyWorkUpdates", updateDocId(input.projectId, input.userId, input.date));
    const now = serverTimestamp();
    await setDoc(ref, {
      organizationId: input.organizationId,
      projectId: input.projectId,
      taskId: input.taskId ?? null,
      userId: input.userId,
      date: input.date,
      workSummary: input.workSummary,
      completedWork: input.completedWork,
      blockers: input.blockers ?? "",
      tomorrowPlan: input.tomorrowPlan ?? "",
      evidence: input.evidence,
      status: "SUBMITTED" as DailyUpdateStatus,
      submittedAt: now,
      reviewedAt: null,
      reviewedBy: null,
      reviewerComment: null,
      createdAt: now,
      updatedAt: now,
    });
  } catch (error) {
    throw new Error(getFirestoreErrorMessage(error, "dailyWorkUpdates:create"));
  }
}

/** Editing today's own update — only permitted (by firestore.rules) while it's still awaiting review (status "SUBMITTED"). */
export async function editOwnDailyUpdate(
  updateId: string,
  patch: { taskId?: string | null; workSummary: string; completedWork: string; blockers?: string; tomorrowPlan?: string; evidence: WorkEvidence[] }
): Promise<void> {
  try {
    await updateDoc(doc(db, "dailyWorkUpdates", updateId), { ...patch, updatedAt: serverTimestamp() });
  } catch (error) {
    throw new Error(getFirestoreErrorMessage(error, "dailyWorkUpdates:edit"));
  }
}

/** Manager/Admin review action — status must be one of the three review outcomes; reviewedBy is always the caller's own uid (firestore.rules requires this, preventing attribution to someone else). */
export async function reviewDailyUpdate(
  updateId: string,
  reviewerId: string,
  status: Exclude<DailyUpdateStatus, "SUBMITTED">,
  reviewerComment: string
): Promise<void> {
  try {
    await updateDoc(doc(db, "dailyWorkUpdates", updateId), {
      status,
      reviewedBy: reviewerId,
      reviewedAt: serverTimestamp(),
      reviewerComment: reviewerComment.trim() || null,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    throw new Error(getFirestoreErrorMessage(error, "dailyWorkUpdates:review"));
  }
}
