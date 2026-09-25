"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { usePlatform } from "@/components/platform/platform-provider";
import { TaskoraGuide } from "@/components/settings/taskora-guide";

const NOTIFICATION_ITEMS = [
  { id: "new-org", title: "New organization onboarded", description: "Get notified whenever a new organization joins the platform." },
  { id: "org-suspended", title: "Organization suspended", description: "Get notified when an organization is suspended." },
  { id: "system-incident", title: "System incident", description: "Get notified when a platform service reports degraded status." },
  { id: "weekly-digest", title: "Weekly platform digest", description: "A weekly summary of platform-wide growth and activity." },
];

export function SuperAdminSettingsView() {
  const { organizations, admins, users } = usePlatform();
  const [notifPrefs, setNotifPrefs] = useState<Record<string, boolean>>(
    Object.fromEntries(NOTIFICATION_ITEMS.map((item) => [item.id, true]))
  );

  return (
    <Tabs defaultValue="platform">
      <TabsList className="flex-wrap">
        <TabsTrigger value="platform">Platform</TabsTrigger>
        <TabsTrigger value="organizations">Organizations</TabsTrigger>
        <TabsTrigger value="notifications">Notifications</TabsTrigger>
        <TabsTrigger value="security">Security</TabsTrigger>
        <TabsTrigger value="preferences">Preferences</TabsTrigger>
        <TabsTrigger value="guide">TASKORA Guide</TabsTrigger>
      </TabsList>

      <TabsContent value="platform" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Platform Overview</CardTitle>
            <CardDescription>High-level snapshot of the TASKORA platform</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{organizations.length}</span> organizations,{" "}
            <span className="font-medium text-foreground">{admins.length}</span> administrators, and{" "}
            <span className="font-medium text-foreground">{users.length}</span> users on the platform.
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="organizations" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Organizations</CardTitle>
            <CardDescription>Manage organizations from the Organizations page</CardDescription>
          </CardHeader>
        </Card>
      </TabsContent>

      <TabsContent value="notifications" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>Choose what you get notified about as the platform owner</CardDescription>
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
            <CardDescription>Platform-wide access and authentication policies</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Platform-level SSO enforcement and audit log export will be available in a future update.
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="preferences" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Preferences</CardTitle>
            <CardDescription>Personalize how TASKORA looks for you</CardDescription>
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
