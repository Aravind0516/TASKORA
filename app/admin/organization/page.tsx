import type { Metadata } from "next";
import { AdminOrganizationView } from "@/components/admin/admin-organization-view";

export const metadata: Metadata = { title: "Admin · Organization" };

export default function AdminOrganizationPage() {
  return <AdminOrganizationView />;
}
