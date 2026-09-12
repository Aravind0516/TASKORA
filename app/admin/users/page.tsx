import type { Metadata } from "next";
import { AdminUsersView } from "@/components/admin/admin-users-view";

export const metadata: Metadata = { title: "Admin · Users" };

export default function AdminUsersPage() {
  return <AdminUsersView />;
}
