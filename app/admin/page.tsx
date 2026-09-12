import type { Metadata } from "next";
import { AdminOverviewView } from "@/components/admin/admin-overview-view";

export const metadata: Metadata = { title: "Admin · Command Center" };

export default function AdminPage() {
  return <AdminOverviewView />;
}
