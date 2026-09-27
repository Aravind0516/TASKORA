import { collection, deleteDoc, doc, onSnapshot, query, serverTimestamp, setDoc, where, type QueryDocumentSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { getFirestoreErrorMessage } from "@/lib/firebase/firestore-errors";
import { toIso } from "@/lib/firebase/timestamp";
import type { PerformerPeriod, TopPerformer } from "@/types/top-performer";

export function topPerformerDocId(organizationId: string, period: PerformerPeriod): string {
  return `${organizationId}_${period}`;
}

function fromDoc(snap: QueryDocumentSnapshot): TopPerformer {
  const data = snap.data();
  return {
    id: snap.id,
    organizationId: data.organizationId,
    period: data.period,
    periodKey: data.periodKey,
    userId: data.userId,
    displayName: data.displayName,
    headline: data.headline ?? null,
    message: data.message ?? "",
    publishedBy: data.publishedBy,
    publishedByName: data.publishedByName ?? "",
    publishedAt: toIso(data.publishedAt),
  };
}

/**
 * The organization's current Top Performer recognitions (at most two
 * documents: weekly and monthly). Queried — not fetched by id — because
 * firestore.rules' read rule depends on the document's organizationId, which
 * Firestore can only prove for a query scoped to that organization.
 */
export function subscribeToTopPerformers(
  organizationId: string,
  onData: (performers: TopPerformer[]) => void,
  onError: (message: string) => void
): () => void {
  const q = query(collection(db, "topPerformers"), where("organizationId", "==", organizationId));
  return onSnapshot(
    q,
    (snapshot) => onData(snapshot.docs.map(fromDoc)),
    (error) => onError(getFirestoreErrorMessage(error, "topPerformers"))
  );
}

export interface PublishTopPerformerInput {
  organizationId: string;
  period: PerformerPeriod;
  periodKey: string;
  userId: string;
  displayName: string;
  headline: string | null;
  message: string;
  publishedBy: string;
  publishedByName: string;
}

/** Admin-only (enforced by firestore.rules). Replaces the organization's current recognition for that period type. */
export async function publishTopPerformer(input: PublishTopPerformerInput): Promise<void> {
  try {
    await setDoc(doc(db, "topPerformers", topPerformerDocId(input.organizationId, input.period)), {
      ...input,
      message: input.message.trim(),
      publishedAt: serverTimestamp(),
    });
  } catch (error) {
    throw new Error(getFirestoreErrorMessage(error, "topPerformers:publish"));
  }
}

/** Admin-only. Takes the recognition down so members no longer see it. */
export async function removeTopPerformer(organizationId: string, period: PerformerPeriod): Promise<void> {
  try {
    await deleteDoc(doc(db, "topPerformers", topPerformerDocId(organizationId, period)));
  } catch (error) {
    throw new Error(getFirestoreErrorMessage(error, "topPerformers:remove"));
  }
}
