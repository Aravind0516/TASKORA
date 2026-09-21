import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { ApiError } from "@/lib/server/api-response";
import { writeNotification } from "@/lib/server/notifications";
import { awardCredit, DuplicateCreditAwardError } from "@/lib/server/credits";
import { CREDIT_CATEGORY_LABELS, DEFAULT_CREDIT_WEIGHTS, safeDisplayName, type CreditCategory } from "@/types/credit";

/**
 * The formal "submit project" milestone that drives PROJECT_SUBMISSION /
 * ON_TIME_PROJECT credit automation — deliberately server-side (Admin SDK)
 * so the on-time decision is made against a SERVER timestamp, never
 * whatever the caller's browser clock claims. Awards every project member
 * (never the manager themselves) exactly once per project via
 * lib/server/credits.ts's centralized awardCredit() — the SAME ledger
 * function the manual Award/Deduct dialog now also goes through (see
 * app/api/credits/award/route.ts), so credit logic lives in exactly one
 * place rather than being duplicated per automation.
 */
export async function submitProject(projectId: string, actorUid: string, actorRole: string, actorOrgId: string | null) {
  const db = getAdminDb();
  const projectRef = db.collection("projects").doc(projectId);
  const projectSnap = await projectRef.get();
  if (!projectSnap.exists) throw new ApiError(404, "Project not found.");
  const project = projectSnap.data()!;

  const isPrivileged = actorRole === "admin" || actorRole === "super_admin";
  const isProjectManager = project.managerId === actorUid;
  if (!isPrivileged && !isProjectManager) {
    throw new ApiError(403, "Only this project's manager or an organization admin can submit it.");
  }
  if (actorRole === "admin" && project.organizationId !== actorOrgId) {
    throw new ApiError(403, "This project belongs to a different organization.");
  }
  if (project.submissionStatus === "SUBMITTED") {
    throw new ApiError(409, "This project has already been submitted.");
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const dueDate = project.dueDate ? new Date(project.dueDate) : null;
  const onTime = dueDate ? now.getTime() <= dueDate.getTime() : true;

  // updatedAt must stay a Firestore Timestamp (FieldValue.serverTimestamp()),
  // matching lib/services/project.service.ts's own convention exactly — the
  // "projects" composite index orders by updatedAt, and mixing Timestamp
  // and plain-string values in that field across documents would sort
  // inconsistently. submittedAt is a plain ISO string since nothing orders
  // by it (same convention as startDate/dueDate).
  await projectRef.update({ submissionStatus: "SUBMITTED", submittedAt: nowIso, updatedAt: FieldValue.serverTimestamp() });

  const rulesSnap = await db.collection("creditRules").doc(project.organizationId).get();
  const weights = (rulesSnap.data()?.weights as Record<CreditCategory, number> | undefined) ?? DEFAULT_CREDIT_WEIGHTS;

  const memberIds: string[] = (project.memberIds ?? []).filter((id: string) => id !== project.managerId);
  let awardedCount = 0;

  for (const uid of memberIds) {
    const userSnap = await db.collection("users").doc(uid).get();
    const userData = userSnap.data();
    if (!userData) continue;
    const displayName = safeDisplayName(userData.name ?? "Member");
    const candidateId: string | null = userData.userId ?? null;

    const categories: Array<{ category: CreditCategory; credits: number }> = [
      { category: "PROJECT_SUBMISSION", credits: weights.PROJECT_SUBMISSION },
    ];
    if (onTime) categories.push({ category: "ON_TIME_PROJECT", credits: weights.ON_TIME_PROJECT });

    let anyAwarded = false;
    for (const { category, credits } of categories) {
      try {
        await awardCredit({
          organizationId: project.organizationId,
          userId: uid,
          candidateId,
          displayName,
          category,
          credits,
          sourceType: "PROJECT",
          sourceId: projectId,
          action: `${CREDIT_CATEGORY_LABELS[category]} — ${project.name}`,
          reason: `Automated: project "${project.name}" was submitted${onTime ? " on time" : ""}.`,
          awardedBy: actorUid,
          // This function sends its own single combined notification below
          // instead of one per category — a candidate submitting on time
          // gets ONE "credits awarded" message, not two back-to-back ones.
          skipNotification: true,
        });
        anyAwarded = true;
      } catch (error) {
        if (!(error instanceof DuplicateCreditAwardError)) throw error;
        // Already awarded for this project+category — a re-submit attempt
        // never double-credits; this specific category is just skipped.
      }
    }

    if (anyAwarded) {
      awardedCount++;
      await writeNotification({
        userId: uid,
        organizationId: project.organizationId,
        actorId: actorUid,
        type: "credit_awarded",
        title: "Credits awarded",
        message: `Project "${project.name}" was submitted${onTime ? " on time" : ""} — credits have been added to your account.`,
        href: "/credits",
      });
    }
  }

  return { onTime, awardedCount };
}
