import type { Metadata } from "next";
import { AdminWorkVerificationView } from "@/components/admin/admin-work-verification-view";

export const metadata: Metadata = { title: "Work Verification · TASKORA" };

export default function AdminWorkVerificationPage() {
  return <AdminWorkVerificationView />;
}
