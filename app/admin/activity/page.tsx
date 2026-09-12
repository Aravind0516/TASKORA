import type { Metadata } from "next";
import { AdminActivityView } from "@/components/admin/admin-activity-view";

export const metadata: Metadata = { title: "Admin · Activity" };

export default function AdminActivityPage() {
  return <AdminActivityView />;
}
