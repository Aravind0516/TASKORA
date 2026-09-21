import type { Metadata } from "next";
import { AdminCreditsView } from "@/components/admin/admin-credits-view";

export const metadata: Metadata = { title: "Credit Management · TASKORA" };

export default function AdminCreditsPage() {
  return <AdminCreditsView />;
}
