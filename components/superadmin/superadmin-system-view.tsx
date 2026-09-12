"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Server, XCircle } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { formatDate } from "@/lib/format";
import { usePlatform } from "@/components/platform/platform-provider";
import type { ServiceHealth } from "@/types/platform";

const STATUS_ICON: Record<ServiceHealth, typeof CheckCircle2> = {
  Healthy: CheckCircle2,
  Warning: AlertTriangle,
  Critical: XCircle,
};

const STATUS_TEXT: Record<ServiceHealth, string> = {
  Healthy: "text-[#0ca30c]",
  Warning: "text-[#fab219]",
  Critical: "text-[#d03b3b]",
};

const STATUS_VARIANT: Record<ServiceHealth, "default" | "outline" | "destructive"> = {
  Healthy: "default",
  Warning: "outline",
  Critical: "destructive",
};

export function SuperAdminSystemView() {
  const [loading, setLoading] = useState(true);
  const { systemServices } = usePlatform();

  useEffect(() => {
    const timeout = setTimeout(() => setLoading(false), 450);
    return () => clearTimeout(timeout);
  }, []);

  if (loading) {
    return (
      <div>
        <PageHeader title="System Control" description="Platform infrastructure health and performance" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const overallStatus: ServiceHealth = systemServices.some((s) => s.status === "Critical")
    ? "Critical"
    : systemServices.some((s) => s.status === "Warning")
      ? "Warning"
      : "Healthy";
  const avgUptime = Math.round(
    (systemServices.reduce((sum, s) => sum + s.uptimePct, 0) / Math.max(systemServices.length, 1)) * 100
  ) / 100;
  const incidents = systemServices
    .filter((s) => s.lastIncidentAt)
    .sort((a, b) => new Date(b.lastIncidentAt!).getTime() - new Date(a.lastIncidentAt!).getTime());

  const OverallIcon = STATUS_ICON[overallStatus];

  return (
    <div>
      <PageHeader title="System Control" description="Platform infrastructure health and performance — simulated for this demo" />

      <Card className="mb-6">
        <CardContent className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <OverallIcon className={`size-6 shrink-0 ${STATUS_TEXT[overallStatus]}`} />
            <div>
              <p className="font-semibold text-foreground">
                {overallStatus === "Healthy" ? "All systems operational" : overallStatus === "Warning" ? "Degraded performance detected" : "Active incident"}
              </p>
              <p className="text-sm text-muted-foreground">Average uptime across all services: {avgUptime}%</p>
            </div>
          </div>
          <Badge variant={STATUS_VARIANT[overallStatus]}>{overallStatus}</Badge>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {systemServices.map((service) => {
          const Icon = STATUS_ICON[service.status];
          return (
            <Card key={service.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Server className="size-4 text-muted-foreground" />
                    {service.name}
                  </CardTitle>
                  <Icon className={`size-4 shrink-0 ${STATUS_TEXT[service.status]}`} />
                </div>
                <CardDescription>
                  <Badge variant={STATUS_VARIANT[service.status]}>{service.status}</Badge>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
                    <span>Uptime</span>
                    <span>{service.uptimePct}%</span>
                  </div>
                  <Progress value={service.uptimePct} />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Latency</span>
                  <span className="text-foreground">{service.latencyMs}ms</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Last incident</span>
                  <span className="text-foreground">{service.lastIncidentAt ? formatDate(service.lastIncidentAt) : "None"}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Recent System Events</CardTitle>
          <CardDescription>Latest recorded incidents across platform services</CardDescription>
        </CardHeader>
        <CardContent className="divide-y divide-border px-5">
          {incidents.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">No incidents recorded — all services have a clean history.</p>
          ) : (
            incidents.map((service) => {
              const Icon = STATUS_ICON[service.status];
              return (
                <div key={service.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <Icon className={`size-4 shrink-0 ${STATUS_TEXT[service.status]}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground">{service.name}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(service.lastIncidentAt!)}</p>
                  </div>
                  <Badge variant={STATUS_VARIANT[service.status]}>{service.status}</Badge>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
