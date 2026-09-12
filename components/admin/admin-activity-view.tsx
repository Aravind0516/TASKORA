"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, CheckCircle2, FolderPlus, ListPlus, UserPlus, UsersRound } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { initials, formatDate, timeAgo } from "@/lib/format";
import { usePlatform } from "@/components/platform/platform-provider";
import type { PlatformActivityAction } from "@/types/platform";

const ACTION_ICON: Partial<Record<PlatformActivityAction, typeof FolderPlus>> = {
  project_created: FolderPlus,
  project_completed: CheckCircle2,
  team_created: UsersRound,
  user_invited: UserPlus,
  user_joined: UserPlus,
  task_completed: ListPlus,
};

const ACTION_LABELS: Record<PlatformActivityAction, string> = {
  organization_created: "created the organization",
  organization_suspended: "suspended the organization",
  organization_activated: "activated the organization",
  admin_registered: "registered as admin",
  admin_suspended: "was suspended",
  user_invited: "invited",
  user_joined: "joined",
  team_created: "created team",
  project_created: "created project",
  project_completed: "completed project",
  user_assigned: "assigned",
  task_completed: "completed task",
};

export function AdminActivityView() {
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<PlatformActivityAction | "all">("all");
  const { currentOrganizationId, activityInOrg } = usePlatform();

  useEffect(() => {
    const timeout = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(timeout);
  }, []);

  const activity = activityInOrg(currentOrganizationId);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return activity.filter((entry) => {
      if (actionFilter !== "all" && entry.action !== actionFilter) return false;
      if (q && !`${entry.actorName} ${entry.entityName}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [activity, search, actionFilter]);

  return (
    <div>
      <PageHeader title="Activity" description="A timeline of everything happening in your organization" />

      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-xs">
          <Input placeholder="Search activity..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={actionFilter} onValueChange={(v) => setActionFilter((v ?? "all") as PlatformActivityAction | "all")}>
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue placeholder="Action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All actions</SelectItem>
            {Object.entries(ACTION_LABELS).map(([action, label]) => (
              <SelectItem key={action} value={action}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <Skeleton className="h-96 w-full rounded-xl" />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Activity} title="No activity yet" description="Actions taken in your organization will show up here." />
      ) : (
        <Card>
          <CardContent className="divide-y divide-border px-5">
            {filtered.map((entry) => {
              const Icon = ACTION_ICON[entry.action] ?? Activity;
              return (
                <div key={entry.id} className="flex items-start gap-3 py-4 first:pt-4 last:pb-4">
                  <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <Icon className="size-4" />
                  </div>
                  <Avatar size="sm" className="hidden sm:flex">
                    <AvatarFallback>{initials(entry.actorName)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground">
                      <span className="font-medium">{entry.actorName}</span>{" "}
                      <span className="text-muted-foreground">
                        {ACTION_LABELS[entry.action]} <span className="font-medium text-foreground">{entry.entityName}</span>
                      </span>
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {timeAgo(entry.createdAt)} · {formatDate(entry.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
