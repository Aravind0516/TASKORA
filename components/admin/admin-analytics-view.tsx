"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { DistributionBarChart } from "@/components/analytics/distribution-bar-chart";
import { CompletionTrendChart } from "@/components/analytics/completion-trend-chart";
import { CATEGORICAL } from "@/lib/chart-colors";
import { usePlatform } from "@/components/platform/platform-provider";
import { PLATFORM_TASK_STATUSES, PLATFORM_PRIORITIES } from "@/lib/platform/constants";
import { buildPlatformCompletionTrend } from "@/lib/platform/analytics";

export function AdminAnalyticsView() {
  const [loading, setLoading] = useState(true);
  const { currentOrganizationId, tasksInOrg, teamsInOrg } = usePlatform();

  useEffect(() => {
    const timeout = setTimeout(() => setLoading(false), 450);
    return () => clearTimeout(timeout);
  }, []);

  const tasks = tasksInOrg(currentOrganizationId);
  const teams = teamsInOrg(currentOrganizationId);

  if (loading) {
    return (
      <div>
        <PageHeader title="Analytics" description="Productivity and delivery insights for your organization" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const statusItems = PLATFORM_TASK_STATUSES.map((status, i) => ({
    label: status,
    value: tasks.filter((t) => t.status === status).length,
    color: CATEGORICAL[i],
  }));
  const priorityItems = PLATFORM_PRIORITIES.map((priority, i) => ({
    label: priority,
    value: tasks.filter((t) => t.priority === priority).length,
    color: CATEGORICAL[i],
  }));
  const completionTrend = buildPlatformCompletionTrend(tasks);

  const teamComparison = teams.map((team) => {
    const teamTasks = tasks.filter((t) => team.projectIds.includes(t.projectId));
    const completed = teamTasks.filter((t) => t.status === "Completed").length;
    const rate = teamTasks.length > 0 ? Math.round((completed / teamTasks.length) * 100) : 0;
    return { team, rate, total: teamTasks.length };
  });

  return (
    <div>
      <PageHeader title="Analytics" description="Productivity and delivery insights for your organization" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Task Status Distribution</CardTitle>
            <CardDescription>All tasks grouped by workflow status</CardDescription>
          </CardHeader>
          <CardContent>
            <DistributionBarChart items={statusItems} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Priority Distribution</CardTitle>
            <CardDescription>All tasks grouped by priority</CardDescription>
          </CardHeader>
          <CardContent>
            <DistributionBarChart items={priorityItems} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Task Velocity</CardTitle>
            <CardDescription>Tasks completed per week over the last 8 weeks</CardDescription>
          </CardHeader>
          <CardContent>
            <CompletionTrendChart data={completionTrend} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Team Comparison</CardTitle>
            <CardDescription>Completion rate by team</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {teamComparison.map(({ team, rate, total }) => (
              <div key={team.id}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">{team.name}</span>
                  <span className="text-muted-foreground">{rate}% · {total} tasks</span>
                </div>
                <Progress value={rate} />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
