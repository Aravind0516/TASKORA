import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { KanbanBoard } from "@/components/kanban/kanban-board";

export const metadata: Metadata = { title: "Kanban" };

export default function KanbanPage() {
  return (
    <div>
      <PageHeader title="Kanban" description="Track task progress across the full workflow" />
      <KanbanBoard />
    </div>
  );
}
