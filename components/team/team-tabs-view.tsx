"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TeamDirectory } from "@/components/team/team-directory";
import { WorkloadView } from "@/components/team/workload-view";

export function TeamTabsView() {
  return (
    <Tabs defaultValue="directory">
      <TabsList>
        <TabsTrigger value="directory">Directory</TabsTrigger>
        <TabsTrigger value="workload">Workload</TabsTrigger>
      </TabsList>
      <TabsContent value="directory" className="mt-4">
        <TeamDirectory />
      </TabsContent>
      <TabsContent value="workload" className="mt-4">
        <WorkloadView />
      </TabsContent>
    </Tabs>
  );
}
