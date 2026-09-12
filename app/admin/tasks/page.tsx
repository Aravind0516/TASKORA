import type { Metadata } from "next";
import { AdminTasksView } from "@/components/admin/admin-tasks-view";

export const metadata: Metadata = { title: "Admin · Tasks" };

export default function AdminTasksPage() {
  return <AdminTasksView />;
}
