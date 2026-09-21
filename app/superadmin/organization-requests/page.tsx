import type { Metadata } from "next";
import { SuperAdminOrganizationRequestsView } from "@/components/superadmin/superadmin-organization-requests-view";

export const metadata: Metadata = { title: "Organization Requests" };

export default function SuperAdminOrganizationRequestsPage() {
  return <SuperAdminOrganizationRequestsView />;
}
