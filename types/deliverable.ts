// Firestore-backed (projectDeliverables/{id}) — replaces the earlier static
// mock (lib/mock-data/deliverables.ts, now unused). Statuses kept identical
// to the original mock UI ("Pending" -> "Ready" -> "Delivered") so the
// existing DeliverablesList badge styling/copy needed no changes, only a
// real data source underneath it.

export type DeliverableStatus = "Pending" | "Ready" | "Delivered";

export interface Deliverable {
  id: string;
  organizationId: string;
  projectId: string;
  title: string;
  description: string;
  status: DeliverableStatus;
  /** ISO date, optional — a deliverable isn't required to have one. */
  dueDate: string | null;
  /** A single responsible member — null until an Admin/Manager assigns one. */
  assignedTo: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  /** Set automatically when status transitions to "Delivered"; cleared if moved back. */
  completedAt: string | null;
}
