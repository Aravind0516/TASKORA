import type { Metadata } from "next";
import { SuperAdminProjectsView } from "@/components/superadmin/superadmin-projects-view";

export const metadata: Metadata = { title: "Super Admin · Projects" };

export default function SuperAdminProjectsPage() {
  return <SuperAdminProjectsView />;
}
