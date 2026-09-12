import type { Metadata } from "next";
import { AdminTeamsView } from "@/components/admin/admin-teams-view";

export const metadata: Metadata = { title: "Admin · Teams" };

export default function AdminTeamsPage() {
  return <AdminTeamsView />;
}
