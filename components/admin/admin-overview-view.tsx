"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, UsersRound, FolderKanban, ListChecks, TrendingUp, AlertTriangle, CheckCircle2, Circle, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { EmptyState } from "@/components/shared/empty-state";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/shared/status-badge";
import { initials, isOverdue, timeAgo, formatDate } from "@/lib/format";
import { usePlatform } from "@/components/platform/platform-provider";

interface SetupStep {
  label: string;
  done: boolean;
  href: string;
  actionLabel: string;
}

function SetupProgress({ steps }: { steps: SetupStep[] }) {
  const remaining = steps.filter((s) => !s.done).length;
  if (remaining === 0) return null;

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Get your organization set up</CardTitle>
        <CardDescription>{remaining} step{remaining === 1 ? "" : "s"} left — this is guidance only, nothing here blocks you from working out of order.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2.5">
          {steps.map((step) => (
            <li key={step.label} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                {step.done ? (
                  <CheckCircle2 className="size-4 shrink-0 text-[#0ca30c]" />
                ) : (
                  <Circle className="size-4 shrink-0 text-muted-foreground" />
                )}
                <span className={step.done ? "text-sm text-muted-foreground line-through" : "text-sm font-medium text-foreground"}>
                  {step.label}
                </span>
              </div>
              {!step.done && (
                <Link href={step.href} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                  {step.actionLabel}
                  <ArrowRight className="size-3" />
                </Link>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export function AdminOverviewView() {
  const [loading, setLoading] = useState(true);
  const { currentOrganizationId, getOrganization, usersInOrg, teamsInOrg, projectsInOrg, tasksInOrg, activityInOrg, getUser, getTeam } = usePlatform();

  useEffect(() => {
    const timeout = setTimeout(() => setLoading(false), 450);
    return () => clearTimeout(timeout);
  }, []);

  const org = getOrganization(currentOrganizationId);
  const members = usersInOrg(currentOrganizationId);
  const teams = teamsInOrg(currentOrganizationId);
  const projects = projectsInOrg(currentOrganizationId);
  const tasks = tasksInOrg(currentOrganizationId);
  const recentActivity = activityInOrg(currentOrganizationId).slice(0, 6);

  const activeProjects = projects.filter((p) => p.status === "Active");
  const openTasks = tasks.filter((t) => t.status !== "Completed");
  const completedTasks = tasks.filter((t) => t.status === "Completed");
  const overdueTasks = tasks.filter((t) => isOverdue(t.dueDate, t.status === "Completed"));
  const completionRate = tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0;

  const upcomingTasks = tasks
    .filter((t) => t.status !== "Completed")
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 5);

  const teamWorkload = teams.map((team) => {
    const teamTasks = tasks.filter((t) => team.projectIds.includes(t.projectId));
    const open = teamTasks.filter((t) => t.status !== "Completed").length;
    return { team, open, total: teamTasks.length };
  });

  if (loading) {
    return (
      <div>
        <PageHeader title="Organization Command Center" description="Loading your organization's data…" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Organization Command Center"
        description={`What's happening inside ${org?.name ?? "your organization"}.`}
      />

      <SetupProgress
        steps={[
          { label: "Organization created", done: Boolean(org), href: "/admin/organization", actionLabel: "View" },
          { label: "Add team members", done: members.length > 0, href: "/admin/users", actionLabel: "Add Members" },
          { label: "Create teams", done: teams.length > 0, href: "/admin/teams", actionLabel: "Create Teams" },
          { label: "Create projects", done: projects.length > 0, href: "/admin/projects", actionLabel: "Create Projects" },
          { label: "Assign tasks", done: tasks.length > 0, href: "/admin/tasks", actionLabel: "Assign Tasks" },
        ]}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total Members" value={String(members.length)} icon={Users} />
        <KpiCard label="Active Teams" value={String(teams.length)} icon={UsersRound} />
        <KpiCard label="Active Projects" value={String(activeProjects.length)} icon={FolderKanban} />
        <KpiCard label="Open Tasks" value={String(openTasks.length)} icon={ListChecks} />
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
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Projects Overview</CardTitle>
            <CardDescription>Progress across every active project</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {projects.length === 0 ? (
              <p className="text-sm text-muted-foreground">No projects yet.</p>
            ) : (
              projects.slice(0, 5).map((project) => (
                <div key={project.id}>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="truncate text-sm font-medium text-foreground">{project.name}</span>
                      <StatusBadge status={project.status} />
                    </div>
                    <span className="shrink-0 text-sm font-medium tabular-nums text-muted-foreground">
                      {project.progress}%
                    </span>
                  </div>
                  <Progress value={project.progress} />
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Team Workload</CardTitle>
            <CardDescription>Open tasks per team</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {teamWorkload.length === 0 ? (
              <p className="text-sm text-muted-foreground">No teams yet.</p>
            ) : (
              teamWorkload.map(({ team, open, total }) => (
                <div key={team.id} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{team.name}</p>
                    <p className="text-xs text-muted-foreground">{team.memberIds.length} members</p>
                  </div>
                  <span className="shrink-0 text-xs font-medium text-muted-foreground">
                    {open}/{total} open
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest updates in your organization</CardDescription>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <EmptyState icon={ListChecks} title="No activity yet" />
            ) : (
              <ul className="space-y-4">
                {recentActivity.map((entry) => (
                  <li key={entry.id} className="flex items-start gap-3">
                    <Avatar size="sm">
                      <AvatarFallback>{initials(entry.actorName)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-foreground">
                        <span className="font-medium">{entry.actorName}</span>{" "}
                        <span className="text-muted-foreground">{entry.entityName}</span>
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{timeAgo(entry.createdAt)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Upcoming Deadlines</CardTitle>
            <CardDescription>Open tasks due soonest</CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">No upcoming deadlines.</p>
            ) : (
              <ul className="space-y-4">
                {upcomingTasks.map((task) => {
                  const assignee = task.assigneeId ? getUser(task.assigneeId) : undefined;
                  return (
                    <li key={task.id} className="flex items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{task.title}</p>
                        <p className="text-xs text-muted-foreground">{assignee?.name ?? "Unassigned"}</p>
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">{formatDate(task.dueDate)}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Team Performance</CardTitle>
            <CardDescription>Team leads at a glance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {teams.map((team) => {
              const lead = getTeam(team.id) ? getUser(team.leadId) : undefined;
              return (
                <div key={team.id} className="flex items-center gap-3">
                  <Avatar size="sm">
                    <AvatarFallback>{lead ? initials(lead.name) : "?"}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{team.name}</p>
                    <p className="truncate text-xs text-muted-foreground">Led by {lead?.name ?? "Unassigned"}</p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
