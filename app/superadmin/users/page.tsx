import type { Metadata } from "next";
import { SuperAdminUsersView } from "@/components/superadmin/superadmin-users-view";

export const metadata: Metadata = { title: "Super Admin · Users" };

export default function SuperAdminUsersPage() {
  return <SuperAdminUsersView />;
}
