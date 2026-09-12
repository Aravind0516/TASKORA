import type { Metadata } from "next";
import { SuperAdminSystemView } from "@/components/superadmin/superadmin-system-view";

export const metadata: Metadata = { title: "Super Admin · System Control" };

export default function SuperAdminSystemPage() {
  return <SuperAdminSystemView />;
}
