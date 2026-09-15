import {
  collection,
  doc,
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

/** Every update submitted for one project, across every member — powers the manager's Work Verification dashboard (firestore.rules scopes actual read access to that project's Admin/manager, or the update's own author). */
export function subscribeToProjectDailyUpdates(
  projectId: string,
  onData: (updates: DailyWorkUpdate[]) => void,
  onError: (message: string) => void
): () => void {
  const q = query(collection(db, "dailyWorkUpdates"), where("projectId", "==", projectId), orderBy("date", "desc"));
  return onSnapshot(
    q,
    (snapshot) => onData(snapshot.docs.map(updateFromDoc)),
    (error) => onError(getFirestoreErrorMessage(error, "dailyWorkUpdates:project"))
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
