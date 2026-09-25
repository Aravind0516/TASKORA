"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { usePlatform } from "@/components/platform/platform-provider";
import { SubscriptionStatusBadge } from "@/components/shared/subscription-status-badge";
import { getEffectiveSubscriptionStatus } from "@/lib/access-control";
import { TaskoraGuide } from "@/components/settings/taskora-guide";

const NOTIFICATION_ITEMS = [
  { id: "new-user", title: "New member joins", description: "Get notified when someone joins your organization." },
  { id: "project-created", title: "Project created", description: "Get notified when a new project is created." },
  { id: "task-overdue", title: "Task overdue", description: "Get notified when a task in your organization becomes overdue." },
  { id: "weekly-digest", title: "Weekly digest", description: "A weekly summary of organization activity." },
];

export function AdminSettingsView() {
  const { currentOrganizationId, getOrganization, usersInOrg, teamsInOrg, projectsInOrg } = usePlatform();
  const org = getOrganization(currentOrganizationId);
  const [notifPrefs, setNotifPrefs] = useState<Record<string, boolean>>(
    Object.fromEntries(NOTIFICATION_ITEMS.map((item) => [item.id, true]))
  );

  const members = usersInOrg(currentOrganizationId);
  const teams = teamsInOrg(currentOrganizationId);
  const projects = projectsInOrg(currentOrganizationId);

  return (
    <Tabs defaultValue="organization">
      <TabsList className="flex-wrap">
        <TabsTrigger value="organization">Organization</TabsTrigger>
        <TabsTrigger value="members">Members</TabsTrigger>
        <TabsTrigger value="teams">Teams</TabsTrigger>
        <TabsTrigger value="projects">Projects</TabsTrigger>
        <TabsTrigger value="notifications">Notifications</TabsTrigger>
        <TabsTrigger value="security">Security</TabsTrigger>
        <TabsTrigger value="preferences">Preferences</TabsTrigger>
        <TabsTrigger value="guide">TASKORA Guide</TabsTrigger>
      </TabsList>

      <TabsContent value="organization" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Organization</CardTitle>
            <CardDescription>Manage your organization&apos;s profile from the Organization page</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            Currently managing <span className="font-medium text-foreground">{org?.name}</span> on the{" "}
            <span className="font-medium text-foreground">{org?.plan}</span> plan.
            {org && <SubscriptionStatusBadge status={getEffectiveSubscriptionStatus(org)} />}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="members" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Members</CardTitle>
            <CardDescription>{members.length} people in your organization — manage them on the Users page</CardDescription>
          </CardHeader>
        </Card>
      </TabsContent>

      <TabsContent value="teams" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Teams</CardTitle>
            <CardDescription>{teams.length} teams — manage them on the Teams page</CardDescription>
          </CardHeader>
        </Card>
      </TabsContent>

      <TabsContent value="projects" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Projects</CardTitle>
            <CardDescription>{projects.length} projects — manage them on the Projects page</CardDescription>
          </CardHeader>
        </Card>
      </TabsContent>

      <TabsContent value="notifications" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>Choose what your organization gets notified about</CardDescription>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            {NOTIFICATION_ITEMS.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                <div>
                  <Label htmlFor={item.id} className="text-sm font-medium text-foreground">
                    {item.title}
                  </Label>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
                <Switch
                  id={item.id}
                  checked={notifPrefs[item.id]}
                  onCheckedChange={(checked) => setNotifPrefs((prev) => ({ ...prev, [item.id]: Boolean(checked) }))}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="security" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Security</CardTitle>
            <CardDescription>Access and authentication policies for your organization</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Single sign-on and advanced access policies are available on the Business plan.
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="preferences" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Preferences</CardTitle>
            <CardDescription>Personalize how TASKORA looks for your organization</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            TASKORA currently follows a light, premium theme. Theme switching will be available in a future update.
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="guide" className="mt-4">
        <TaskoraGuide />
      </TabsContent>
    </Tabs>
  );
}
