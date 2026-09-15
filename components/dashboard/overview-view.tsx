"use client";

import Link from "next/link";
import { FolderKanban, ListChecks, TrendingUp, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { ProjectProgressList } from "@/components/dashboard/project-progress-list";
import { TaskDistribution } from "@/components/dashboard/task-distribution";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { UpcomingDeadlines } from "@/components/dashboard/upcoming-deadlines";
import { MyWorkVerificationCard } from "@/components/dashboard/my-work-verification-card";
import { ManagerPendingReviewsCard } from "@/components/dashboard/manager-pending-reviews-card";
import { WidgetError } from "@/components/shared/widget-error";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useWorkspace } from "@/components/workspace/workspace-provider";
import { useAuth } from "@/components/auth/auth-provider";
import { isOverdue, daysUntil } from "@/lib/format";

export function OverviewView() {
  const { user } = useAuth();
  const { uid, projects, tasks, activity, loaded, errors, retry } = useWorkspace();

  const initialLoading = !loaded.projects || !loaded.tasks || !loaded.activity;
  const firstName = (user?.displayName || user?.email || "there").split(" ")[0];

  if (initialLoading) {
    return (
      <div>
        <PageHeader title="Overview" description={`Welcome back, ${firstName} — here's what's happening across your projects.`} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28 w-full rounded-xl" />
          ))}
        </div>
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Skeleton className="h-64 w-full rounded-xl lg:col-span-2" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  const kpiError = errors.projects ?? errors.tasks;

  const activeProjects = projects.filter((project) => project.status === "Active");
  const completedTasks = tasks.filter((task) => task.status === "Completed");
  const overdueTasks = tasks.filter((task) => isOverdue(task.dueDate, task.status === "Completed"));
  const completionRate = tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0;

  const inProgressProjects = projects
    .filter((project) => project.status !== "Completed")
    .sort((a, b) => b.progress - a.progress)
    .slice(0, 4);

  const upcomingTasks = tasks
    .filter((task) => task.status !== "Completed" && daysUntil(task.dueDate) >= 0)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 5);

  const recentActivity = [...activity]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6);

  // "My Work" — personally-scoped, distinct from the org-wide KPI row below.
  // The Overview page previously showed only organization-wide aggregates,
  // which is why "my immediate work" (assigned tasks, my projects, today's
  // Daily Work Update) wasn't visible without navigating elsewhere first.
  const myTasks = tasks.filter((task) => task.assignedTo === uid);
  const myActiveTasks = myTasks.filter((task) => task.status !== "Completed" && task.status !== "Blocked");
  const myCompletedTasks = myTasks.filter((task) => task.status === "Completed");
  const myOverdueTasks = myTasks.filter((task) => isOverdue(task.dueDate, task.status === "Completed"));
  const myBlockedTasks = myTasks.filter((task) => task.status === "Blocked");
  const myProjects = projects.filter((project) => project.memberIds.includes(uid ?? ""));
  const myWorkVerificationProjects = myProjects.filter((project) => project.workVerificationEnabled);
  const myManagedProjects = projects.filter((project) => project.managerId === uid);

  return (
    <div>
      <PageHeader
        title="Overview"
        description={`Welcome back, ${firstName} — here's what's happening across your projects.`}
      />

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>My Tasks</CardTitle>
            <CardDescription>Assigned to you, across all projects</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Active</span>
              <span className="font-medium text-foreground">{myActiveTasks.length}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Overdue</span>
              <span className={myOverdueTasks.length > 0 ? "font-medium text-[#d03b3b]" : "font-medium text-foreground"}>{myOverdueTasks.length}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Blocked</span>
              <span className="font-medium text-foreground">{myBlockedTasks.length}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Completed</span>
              <span className="font-medium text-foreground">{myCompletedTasks.length}</span>
            </div>
            <Button size="sm" variant="outline" className="mt-2 w-full" nativeButton={false} render={<Link href="/tasks" />}>
              View My Tasks
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>My Projects</CardTitle>
            <CardDescription>Projects you&apos;re a member of</CardDescription>
          </CardHeader>
          <CardContent>
            {myProjects.length === 0 ? (
              <p className="text-sm text-muted-foreground">You&apos;re not on any projects yet.</p>
            ) : (
              <ul className="space-y-3">
                {myProjects.slice(0, 4).map((project) => (
                  <li key={project.id}>
                    <Link href={`/projects/${project.id}`} className="text-sm font-medium text-foreground hover:text-primary hover:underline">
                      {project.name}
                    </Link>
                    <div className="mt-1 flex items-center gap-2">
                      <Progress value={project.progress} className="h-1.5" />
                      <span className="shrink-0 text-xs text-muted-foreground">{project.progress}%</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {uid && <MyWorkVerificationCard uid={uid} workVerificationProjects={myWorkVerificationProjects} />}
      </div>

      {myManagedProjects.length > 0 && (
        <div className="mb-6">
          <ManagerPendingReviewsCard managedProjects={myManagedProjects} />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpiError ? (
          <Card className="col-span-full">
            <CardContent className="px-5 py-5">
              <WidgetError message="Stats unavailable right now." onRetry={retry} />
            </CardContent>
          </Card>
        ) : (
          <>
            <KpiCard label="Active Projects" value={String(activeProjects.length)} icon={FolderKanban} />
            <KpiCard label="Total Tasks" value={String(tasks.length)} icon={ListChecks} />
            <KpiCard
              label="Completion Rate"
              value={`${completionRate}%`}
              helperText={`${completedTasks.length} of ${tasks.length} tasks completed`}
              icon={TrendingUp}
            />
            <KpiCard
              label="Overdue Tasks"
              value={String(overdueTasks.length)}
              helperText={overdueTasks.length > 0 ? "Needs attention" : "All caught up"}
              icon={AlertTriangle}
              accent={overdueTasks.length > 0 ? "critical" : "default"}
            />
          </>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Project Progress</CardTitle>
            <CardDescription>Active and planned projects by completion</CardDescription>
          </CardHeader>
          <CardContent>
            {errors.projects ? (
              <WidgetError message="Project progress unavailable." onRetry={retry} />
            ) : inProgressProjects.length > 0 ? (
              <ProjectProgressList projects={inProgressProjects} />
            ) : (
              <p className="text-sm text-muted-foreground">No active or planned projects yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Task Distribution</CardTitle>
            <CardDescription>Tasks by workflow status</CardDescription>
          </CardHeader>
          <CardContent>
            {errors.tasks ? (
              <WidgetError message="Task data unavailable." onRetry={retry} />
            ) : (
              <TaskDistribution tasks={tasks} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest updates across your projects</CardDescription>
          </CardHeader>
          <CardContent>
            {errors.activity ? (
              <WidgetError message="Activity unavailable." onRetry={retry} />
            ) : recentActivity.length > 0 ? (
              <RecentActivity entries={recentActivity} />
            ) : (
              <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Upcoming Deadlines</CardTitle>
            <CardDescription>Tasks due soonest across all projects</CardDescription>
          </CardHeader>
          <CardContent>
            {errors.tasks ? (
              <WidgetError message="Deadlines unavailable." onRetry={retry} />
            ) : (
              <UpcomingDeadlines tasks={upcomingTasks} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
