"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { WidgetError } from "@/components/shared/widget-error";
import { DistributionBarChart } from "@/components/analytics/distribution-bar-chart";
import { CompletionTrendChart } from "@/components/analytics/completion-trend-chart";
import { ProjectProgressList } from "@/components/dashboard/project-progress-list";
import { TaskTable } from "@/components/tasks/task-table";
import { useWorkspace } from "@/components/workspace/workspace-provider";
import { buildCompletionTrend } from "@/lib/analytics";
import { TASK_STATUSES, type TaskPriority } from "@/types/task";
import { CATEGORICAL } from "@/lib/chart-colors";
import { isOverdue, nowIso } from "@/lib/format";

const PRIORITIES: TaskPriority[] = ["Low", "Medium", "High", "Critical"];

export function AnalyticsView() {
  const { projects, tasks, loaded, errors, retry } = useWorkspace();
  const [nowIsoStr] = useState(nowIso);

  const initialLoading = !loaded.projects || !loaded.tasks;

  if (initialLoading) {
    return (
      <div>
        <PageHeader title="Analytics" description="Productivity and delivery insights across your workspace" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-64 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const statusItems = TASK_STATUSES.map((status, index) => ({
    label: status,
    value: tasks.filter((task) => task.status === status).length,
    color: CATEGORICAL[index],
  }));

  const priorityItems = PRIORITIES.map((priority, index) => ({
    label: priority,
    value: tasks.filter((task) => task.priority === priority).length,
    color: CATEGORICAL[index],
  }));

  const overdueTasks = tasks.filter((task) => isOverdue(task.dueDate, task.status === "Completed"));
  const activeProjects = projects.filter((project) => project.status !== "Completed");
  const completionTrend = buildCompletionTrend(tasks, new Date(nowIsoStr));

  return (
    <div>
      <PageHeader title="Analytics" description="Productivity and delivery insights across your workspace" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Task Status Distribution</CardTitle>
            <CardDescription>Tasks grouped by workflow status</CardDescription>
          </CardHeader>
          <CardContent>
            {errors.tasks ? (
              <WidgetError message="Task data unavailable." onRetry={retry} />
            ) : (
              <DistributionBarChart items={statusItems} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Priority Distribution</CardTitle>
            <CardDescription>Tasks grouped by priority level</CardDescription>
          </CardHeader>
          <CardContent>
            {errors.tasks ? (
              <WidgetError message="Task data unavailable." onRetry={retry} />
            ) : (
              <DistributionBarChart items={priorityItems} />
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Completion Trends</CardTitle>
            <CardDescription>Tasks completed per week over the last 8 weeks</CardDescription>
          </CardHeader>
          <CardContent>
            {errors.tasks ? (
              <WidgetError message="Completion trend unavailable." onRetry={retry} />
            ) : (
              <CompletionTrendChart data={completionTrend} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Project Progress</CardTitle>
            <CardDescription>Completion across active and planned projects</CardDescription>
          </CardHeader>
          <CardContent>
            {errors.projects ? (
              <WidgetError message="Project data unavailable." onRetry={retry} />
            ) : activeProjects.length > 0 ? (
              <ProjectProgressList projects={activeProjects} />
            ) : (
              <p className="text-sm text-muted-foreground">No active or planned projects yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Overdue Tasks</CardTitle>
            <CardDescription>{overdueTasks.length} tasks past their due date</CardDescription>
          </CardHeader>
          <CardContent>
            {errors.tasks ? (
              <WidgetError message="Task data unavailable." onRetry={retry} />
            ) : (
              <TaskTable tasks={overdueTasks} emptyMessage="No overdue tasks — nice work!" />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
