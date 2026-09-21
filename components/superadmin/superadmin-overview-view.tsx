"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Building2,
  ShieldCheck,
  Users,
  FolderKanban,
  ListChecks,
  CheckCircle2,
  Activity,
  Radio,
  ClipboardCheck,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { KpiCard } from "@/components/dashboard/kpi-card";
import * as orgRegistrationService from "@/lib/services/organization-registration.service";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CompletionTrendChart } from "@/components/analytics/completion-trend-chart";
import { PersonStatusBadge } from "@/components/platform/person-status-badge";
import { initials, timeAgo } from "@/lib/format";
import { usePlatform } from "@/components/platform/platform-provider";
import { buildMonthlyGrowth } from "@/lib/platform/analytics";

export function SuperAdminOverviewView() {
  const [loading, setLoading] = useState(true);
  const [pendingRegistrations, setPendingRegistrations] = useState(0);
  const { organizations, admins, users, projects, tasks, activity, systemServices } = usePlatform();

  useEffect(() => {
    const timeout = setTimeout(() => setLoading(false), 450);
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    return orgRegistrationService.subscribeToOrganizationRegistrations(
      (requests) => setPendingRegistrations(requests.filter((r) => r.status === "PENDING").length),
      () => setPendingRegistrations(0)
    );
  }, []);

  if (loading) {
    return (
      <div>
        <PageHeader title="Platform Command Center" description="SUPER ADMIN" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const activeOrgs = organizations.filter((o) => o.status === "Active");
  const completedTasks = tasks.filter((t) => t.status === "Completed");
  const activeUsers = users.filter((u) => u.status === "Active");
  const orgGrowth = buildMonthlyGrowth(organizations.map((o) => o.createdAt));
  const recentOrgs = [...organizations].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);
  const recentAdmins = [...admins].sort((a, b) => new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime()).slice(0, 5);
  const recentActivity = [...activity].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 6);
  const criticalServices = systemServices.filter((s) => s.status !== "Healthy");

  return (
    <div>
      <PageHeader
        title="Platform Command Center"
        description="SUPER ADMIN — full visibility across every organization on TASKORA"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total Organizations" value={String(organizations.length)} icon={Building2} />
        <KpiCard label="Active Organizations" value={String(activeOrgs.length)} icon={Building2} />
        <Link href="/superadmin/organization-requests" className="block">
          <KpiCard
            label="Organization Requests"
            value={`Pending: ${pendingRegistrations}`}
            icon={ClipboardCheck}
            accent={pendingRegistrations > 0 ? "critical" : "default"}
          />
        </Link>
        <KpiCard label="Total Administrators" value={String(admins.length)} icon={ShieldCheck} />
        <KpiCard label="Total Users" value={String(users.length)} icon={Users} />
        <KpiCard label="Total Projects" value={String(projects.length)} icon={FolderKanban} />
        <KpiCard label="Total Tasks" value={String(tasks.length)} icon={ListChecks} />
        <KpiCard
          label="Tasks Completed"
          value={String(completedTasks.length)}
          helperText={`${tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0}% completion rate`}
          icon={CheckCircle2}
        />
        <KpiCard
          label="Active Users"
          value={String(activeUsers.length)}
          helperText={criticalServices.length > 0 ? `${criticalServices.length} service issue(s)` : "All systems normal"}
          icon={Activity}
          accent={criticalServices.length > 0 ? "critical" : "default"}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
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
            <CardTitle>System Health</CardTitle>
            <CardDescription>Live service status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {systemServices.slice(0, 5).map((service) => (
              <div key={service.id} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Radio
                    className={
                      service.status === "Healthy"
                        ? "size-3.5 shrink-0 text-success"
                        : service.status === "Warning"
                          ? "size-3.5 shrink-0 text-amber-500"
                          : "size-3.5 shrink-0 text-danger"
                    }
                  />
                  <span className="truncate text-sm text-foreground">{service.name}</span>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">{service.uptimePct}%</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Organizations</CardTitle>
            <CardDescription>Newest onboarded organizations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentOrgs.map((org) => (
              <div key={org.id} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{org.name}</p>
                  <p className="text-xs text-muted-foreground">{timeAgo(org.createdAt)}</p>
                </div>
                <PersonStatusBadge status={org.status} />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Admin Registrations</CardTitle>
            <CardDescription>Newest organization administrators</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentAdmins.map((admin) => (
              <div key={admin.id} className="flex items-center gap-3">
                <Avatar size="sm">
                  <AvatarFallback>{initials(admin.name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{admin.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{timeAgo(admin.joinedAt)}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Platform Activity</CardTitle>
            <CardDescription>Latest events across all organizations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentActivity.map((entry) => (
              <div key={entry.id} className="flex items-start gap-3">
                <Avatar size="sm">
                  <AvatarFallback>{initials(entry.actorName)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-foreground">
                    <span className="font-medium">{entry.actorName}</span>{" "}
                    <span className="text-muted-foreground">{entry.entityName}</span>
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{timeAgo(entry.createdAt)}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
