import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { SettingsView } from "@/components/settings/settings-view";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <div>
      <PageHeader title="Settings" description="Manage your profile, notifications, and workspace preferences" />
      <SettingsView />
    </div>
  );
}
