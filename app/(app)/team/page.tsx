import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { TeamTabsView } from "@/components/team/team-tabs-view";

export const metadata: Metadata = { title: "Team" };

export default function TeamPage() {
  return (
    <div>
      <PageHeader title="Team" description="Manage the people across your workspace" />
      <TeamTabsView />
    </div>
  );
}
