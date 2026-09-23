"use client";

import { useState } from "react";
import { AlertCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useWorkspace } from "@/components/workspace/workspace-provider";
import { updateNotificationPreferences } from "@/lib/services/user.service";
import { NOTIFICATION_CATEGORIES as NOTIFICATION_ITEMS, SOUND_PREFERENCE_KEY } from "@/lib/notifications/categories";

// Personal profile editing (name, title, phone, academic/professional
// details) lives ONLY at /profile (components/candidate/my-profile-view.tsx)
// — this used to have its own separate, duplicate "Profile" tab with a
// second edit path (updateUserProfile/updateDisplayName called directly),
// which is exactly the "two competing profile editors" this page was
// consolidated away from. Settings now only ever holds actual settings.
export function SettingsView() {
  const { uid, getMemberById } = useWorkspace();
  const selfMember = uid ? getMemberById(uid) : undefined;

  function defaultNotifPrefs(): Record<string, boolean> {
    return Object.fromEntries(NOTIFICATION_ITEMS.map((item) => [item.id, true]));
  }

  const [notifPrefs, setNotifPrefs] = useState<Record<string, boolean>>(defaultNotifPrefs);
  const [notifError, setNotifError] = useState<string | null>(null);

  // Same render-body "adjust state when a value changes" pattern used
  // throughout this codebase — selfMember arrives asynchronously once the
  // workspace roster loads, so this can't be a plain useState initializer,
  // and this repo's set-state-in-effect lint rule forbids doing it in a
  // useEffect.
  const [syncedNotifPrefs, setSyncedNotifPrefs] = useState<Record<string, boolean> | null>(
    selfMember?.notificationPreferences ?? null
  );
  if (selfMember?.notificationPreferences && selfMember.notificationPreferences !== syncedNotifPrefs) {
    setSyncedNotifPrefs(selfMember.notificationPreferences);
    setNotifPrefs({ ...defaultNotifPrefs(), ...selfMember.notificationPreferences });
  }

  async function handleNotifPrefChange(itemId: string, checked: boolean) {
    if (!uid) return;
    const next = { ...notifPrefs, [itemId]: checked };
    setNotifPrefs(next);
    setNotifError(null);
    try {
      await updateNotificationPreferences(uid, next);
    } catch (error) {
      setNotifPrefs(notifPrefs); // revert the optimistic flip on failure
      setNotifError(error instanceof Error ? error.message : "Failed to update notification preferences.");
    }
  }

  const soundEnabled = notifPrefs[SOUND_PREFERENCE_KEY] !== false;

  return (
    <Tabs defaultValue="notifications">
      <TabsList>
        <TabsTrigger value="notifications">Notifications</TabsTrigger>
        <TabsTrigger value="appearance">Appearance</TabsTrigger>
      </TabsList>

      <TabsContent value="notifications" className="mt-4 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Notification Sound</CardTitle>
            <CardDescription>Play a short sound when a new notification arrives</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label htmlFor="notification-sound" className="text-sm font-medium text-foreground">
                  Notification sound
                </Label>
                <p className="text-xs text-muted-foreground">
                  Turning this off still shows popups and keeps every notification in your Notification Center — only the sound is muted.
                </p>
              </div>
              <Switch
                id="notification-sound"
                checked={soundEnabled}
                onCheckedChange={(checked) => handleNotifPrefChange(SOUND_PREFERENCE_KEY, Boolean(checked))}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>Choose what you want to be notified about</CardDescription>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            {notifError && (
              <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
                <AlertCircle className="size-4 shrink-0" />
                {notifError}
              </div>
            )}
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
                  onCheckedChange={(checked) => handleNotifPrefChange(item.id, Boolean(checked))}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="appearance" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>Personalize how TASKORA looks on your device</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              TASKORA currently follows a light, premium theme. Theme switching will be available in a future update.
            </p>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
