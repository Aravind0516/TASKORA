import type { Metadata } from "next";
import { AdminProjectsView } from "@/components/admin/admin-projects-view";

export const metadata: Metadata = { title: "Admin · Projects" };

export default function AdminProjectsPage() {
  return <AdminProjectsView />;
}
