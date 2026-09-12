import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { TaskManagementView } from "@/components/tasks/task-management-view";

export const metadata: Metadata = { title: "My Tasks" };

export default function MyTasksPage() {
  return (
    <div>
      <PageHeader title="My Tasks" description="Tasks assigned to you across all projects" />
      <TaskManagementView />
    </div>
  );
}
