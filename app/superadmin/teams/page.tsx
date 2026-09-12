import type { Metadata } from "next";
import { SuperAdminTeamsView } from "@/components/superadmin/superadmin-teams-view";

export const metadata: Metadata = { title: "Super Admin · Teams" };

export default function SuperAdminTeamsPage() {
  return <SuperAdminTeamsView />;
}
