import type { Metadata } from "next";
import { SuperAdminSettingsView } from "@/components/superadmin/superadmin-settings-view";

export const metadata: Metadata = { title: "Super Admin · Settings" };

export default function SuperAdminSettingsPage() {
  return <SuperAdminSettingsView />;
}
