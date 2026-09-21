"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TeamDirectory } from "@/components/team/team-directory";
import { WorkloadView } from "@/components/team/workload-view";
import { TeamPerformanceView } from "@/components/team/team-performance-view";
import { useWorkspace } from "@/components/workspace/workspace-provider";

export function TeamTabsView() {
  const { uid, projects } = useWorkspace();
  const managesAnyProject = projects.some((p) => p.managerId === uid);

  return (
    <Tabs defaultValue="directory">
      <TabsList>
        <TabsTrigger value="directory">Directory</TabsTrigger>
        <TabsTrigger value="workload">Workload</TabsTrigger>
        {managesAnyProject && <TabsTrigger value="performance">Performance</TabsTrigger>}
      </TabsList>
      <TabsContent value="directory" className="mt-4">
        <TeamDirectory />
      </TabsContent>
      <TabsContent value="workload" className="mt-4">
        <WorkloadView />
      </TabsContent>
      {managesAnyProject && (
        <TabsContent value="performance" className="mt-4">
          <TeamPerformanceView />
        </TabsContent>
      )}
    </Tabs>
  );
}
