import type { Deliverable } from "@/types/deliverable";

export const deliverables: Deliverable[] = [
  {
    id: "del-1",
    projectId: "proj-1",
    name: "Design System Handoff",
    status: "Delivered",
    updatedAt: "2026-08-20T15:00:00.000Z",
  },
  {
    id: "del-2",
    projectId: "proj-1",
    name: "Accessibility Audit Report",
    status: "Ready",
    updatedAt: "2026-08-30T12:00:00.000Z",
  },
  {
    id: "del-3",
    projectId: "proj-1",
    name: "Release Notes",
    status: "Pending",
    updatedAt: "2026-09-01T09:00:00.000Z",
  },
  {
    id: "del-4",
    projectId: "proj-2",
    name: "Billing Migration Runbook",
    status: "Ready",
    updatedAt: "2026-08-28T10:00:00.000Z",
  },
  {
    id: "del-5",
    projectId: "proj-2",
    name: "Reconciliation Report Template",
    status: "Pending",
    updatedAt: "2026-09-01T13:10:00.000Z",
  },
  {
    id: "del-6",
    projectId: "proj-6",
    name: "Pricing Page Launch Assets",
    status: "Delivered",
    updatedAt: "2026-06-27T16:00:00.000Z",
  },
];

export function getDeliverablesByProjectId(projectId: string): Deliverable[] {
  return deliverables
    .filter((d) => d.projectId === projectId)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}
