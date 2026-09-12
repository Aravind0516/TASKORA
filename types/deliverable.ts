// Not part of PROJECT_SPEC.md's Firestore collections — an additive, UI-only mock
// concept for the project detail page's Deliverables section. No backend/storage.

export type DeliverableStatus = "Pending" | "Ready" | "Delivered";

export interface Deliverable {
  id: string;
  projectId: string;
  name: string;
  status: DeliverableStatus;
  updatedAt: string;
}
