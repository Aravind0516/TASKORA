import type { Metadata } from "next";
import { SuperAdminOrganizationsView } from "@/components/superadmin/superadmin-organizations-view";

export const metadata: Metadata = { title: "Super Admin · Organizations" };

export default function SuperAdminOrganizationsPage() {
  return <SuperAdminOrganizationsView />;
}
