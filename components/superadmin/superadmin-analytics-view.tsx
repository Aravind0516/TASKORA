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
import { CATEGORICAL, STATUS_COLORS } from "@/lib/chart-colors";
import { usePlatform } from "@/components/platform/platform-provider";
import { buildMonthlyGrowth, buildPlatformCompletionTrend } from "@/lib/platform/analytics";

export function SuperAdminAnalyticsView() {
  const [loading, setLoading] = useState(true);
  const { organizations, users, projects, tasks, systemServices } = usePlatform();

  useEffect(() => {
    const timeout = setTimeout(() => setLoading(false), 450);
    return () => clearTimeout(timeout);
  }, []);

  if (loading) {
    return (
      <div>
        <PageHeader title="Platform Analytics" description="Growth and engagement across the entire platform" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const orgGrowth = buildMonthlyGrowth(organizations.map((o) => o.createdAt));
  const userGrowth = buildMonthlyGrowth(users.map((u) => u.joinedAt));
  const projectGrowth = buildMonthlyGrowth(projects.map((p) => p.createdAt));
  const taskCompletionTrend = buildPlatformCompletionTrend(tasks);

  const orgsByPlan = (["TRIAL", "PREMIUM", "CRAZY"] as const).map((plan, i) => ({
    label: plan,
    value: organizations.filter((o) => o.plan === plan).length,
    color: CATEGORICAL[i],
  }));

  const activeUsers = users.filter((u) => u.status === "Active").length;
  const invitedUsers = users.filter((u) => u.status === "Invited").length;
  const suspendedUsers = users.filter((u) => u.status === "Suspended").length;
  const engagementItems = [
    { label: "Active", value: activeUsers, color: STATUS_COLORS.good },
    { label: "Invited", value: invitedUsers, color: STATUS_COLORS.warning },
    { label: "Suspended", value: suspendedUsers, color: STATUS_COLORS.critical },
  ];

  const orgActivity = [...organizations]
    .sort((a, b) => new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime())
    .slice(0, 6);

  return (
    <div>
      <PageHeader title="Platform Analytics" description="Growth and engagement across the entire platform" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Organization Growth</CardTitle>
            <CardDescription>New organizations onboarded per month</CardDescription>
          </CardHeader>
          <CardContent>
            <CompletionTrendChart data={orgGrowth} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>User Growth</CardTitle>
            <CardDescription>New users joined per month, platform-wide</CardDescription>
          </CardHeader>
          <CardContent>
            <CompletionTrendChart data={userGrowth} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Project Growth</CardTitle>
            <CardDescription>New projects created per month, platform-wide</CardDescription>
          </CardHeader>
          <CardContent>
            <CompletionTrendChart data={projectGrowth} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Task Completion</CardTitle>
            <CardDescription>Tasks completed per week, platform-wide</CardDescription>
          </CardHeader>
          <CardContent>
            <CompletionTrendChart data={taskCompletionTrend} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Organizations by Plan</CardTitle>
            <CardDescription>Distribution of subscription plans</CardDescription>
          </CardHeader>
          <CardContent>
            <DistributionBarChart items={orgsByPlan} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>User Engagement</CardTitle>
            <CardDescription>All users grouped by account status</CardDescription>
          </CardHeader>
          <CardContent>
            <DistributionBarChart items={engagementItems} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Organization Activity</CardTitle>
            <CardDescription>Most recently active organizations on the platform</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {orgActivity.map((org) => (
              <div key={org.id}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">{org.name}</span>
                  <span className="text-muted-foreground">{org.plan} plan</span>
                </div>
                <Progress value={org.status === "Active" ? 100 : 20} />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>System Usage</CardTitle>
            <CardDescription>Uptime by platform service over the last 30 days</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {systemServices.map((service) => (
              <div key={service.id}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">{service.name}</span>
                  <span className="text-muted-foreground">{service.uptimePct}% uptime · {service.latencyMs}ms</span>
                </div>
                <Progress value={service.uptimePct} />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
