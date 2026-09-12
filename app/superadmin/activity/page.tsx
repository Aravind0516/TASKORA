import type { Metadata } from "next";
import { SuperAdminActivityView } from "@/components/superadmin/superadmin-activity-view";

export const metadata: Metadata = { title: "Super Admin · Activity" };

export default function SuperAdminActivityPage() {
  return <SuperAdminActivityView />;
}
