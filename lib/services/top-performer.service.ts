import { apiFetch } from "@/lib/api-client";
import type { PerformerPeriod, TopPerformer } from "@/types/top-performer";

/**
 * Top Performer recognitions go through app/api/top-performers (Admin SDK,
 * claims-checked) rather than direct Firestore access, so publishing and
 * viewing work regardless of which firestore.rules release is deployed.
 */

const CHANGED_EVENT = "taskora:top-performers-changed";

/** The organization's current recognitions (at most weekly + monthly). Members only ever receive their own organization's. */
export async function fetchTopPerformers(organizationId: string): Promise<TopPerformer[]> {
  const { performers } = await apiFetch<{ performers: TopPerformer[] }>(`/api/top-performers?organizationId=${encodeURIComponent(organizationId)}`);
  return performers;
}

/** Lets every mounted banner/publisher on this page refresh right after a publish or removal. */
export function onTopPerformersChanged(listener: () => void): () => void {
  window.addEventListener(CHANGED_EVENT, listener);
  return () => window.removeEventListener(CHANGED_EVENT, listener);
}

function announceChange() {
  window.dispatchEvent(new Event(CHANGED_EVENT));
}

export interface PublishTopPerformerInput {
  period: PerformerPeriod;
  userId: string;
  message: string;
}

/** Admin-only (enforced server-side). Replaces the organization's current recognition for that period type. */
export async function publishTopPerformer(input: PublishTopPerformerInput): Promise<void> {
  await apiFetch("/api/top-performers", { method: "POST", body: JSON.stringify(input) });
  announceChange();
}

/** Admin-only. Takes the recognition down so members no longer see it. */
export async function removeTopPerformer(period: PerformerPeriod): Promise<void> {
  await apiFetch(`/api/top-performers?period=${period}`, { method: "DELETE" });
  announceChange();
}
