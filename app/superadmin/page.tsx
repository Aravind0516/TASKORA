import type { Metadata } from "next";
import { SuperAdminOverviewView } from "@/components/superadmin/superadmin-overview-view";

export const metadata: Metadata = { title: "Super Admin · Command Center" };

export default function SuperAdminPage() {
  return <SuperAdminOverviewView />;
}
