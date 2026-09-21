import type { Metadata } from "next";
import { AdminAccountView } from "@/components/admin/admin-account-view";

export const metadata: Metadata = { title: "Admin · Account" };

export default function AdminAccountPage() {
  return <AdminAccountView />;
}
