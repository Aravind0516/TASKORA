import type { Metadata } from "next";
import { AdminAccountView } from "@/components/admin/admin-account-view";

export const metadata: Metadata = { title: "Super Admin · Account" };

export default function SuperAdminAccountPage() {
  return <AdminAccountView />;
}
