import type { Metadata } from "next";
import { SuperAdminAnalyticsView } from "@/components/superadmin/superadmin-analytics-view";

export const metadata: Metadata = { title: "Super Admin · Analytics" };

export default function SuperAdminAnalyticsPage() {
  return <SuperAdminAnalyticsView />;
}
