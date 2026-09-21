"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/components/auth/auth-provider";
import { useWorkspace } from "@/components/workspace/workspace-provider";
import { updateDisplayName } from "@/lib/services/auth.service";
import { updateUserProfile, updateNotificationPreferences } from "@/lib/services/user.service";
import { subscribeToOrganization } from "@/lib/services/organization.service";
import { initials } from "@/lib/format";
import { ROLE_CAPS_LABEL, ROLE_DISPLAY_LABELS } from "@/lib/platform/constants";
import { NOTIFICATION_CATEGORIES as NOTIFICATION_ITEMS } from "@/lib/notifications/categories";

export function SettingsView() {
  // Role/organizationId here are the SAME central, claims-derived values
  // every other shell reads from AuthProvider — never re-derived from a
  // TeamMember/roster shape, which is why this page used to be able to show
  // a stale/wrong role independent of the rest of the app.
  const { user, role, organizationId } = useAuth();
  const { uid, getMemberById } = useWorkspace();
  const selfMember = uid ? getMemberById(uid) : undefined;
  const [organizationName, setOrganizationName] = useState<string | null>(null);

  useEffect(() => {
    if (!organizationId) {
      let cancelled = false;
      Promise.resolve().then(() => {
        if (!cancelled) setOrganizationName(null);
      });
      return () => {
        cancelled = true;
      };
    }
    return subscribeToOrganization(
      organizationId,
      (org) => setOrganizationName(org?.name ?? null),
      () => setOrganizationName(null)
    );
  }, [organizationId]);

  const [name, setName] = useState(user?.displayName ?? "");
  const [title, setTitle] = useState(selfMember?.title ?? "");
  const [saving, setSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Sync local edit fields when the loaded auth/profile data changes (e.g. once it
  // first arrives, or after a save round-trips) — guarded to avoid clobbering edits.
  const [syncedDisplayName, setSyncedDisplayName] = useState(user?.displayName ?? null);
  if ((user?.displayName ?? null) !== syncedDisplayName) {
    setSyncedDisplayName(user?.displayName ?? null);
    setName(user?.displayName ?? "");
  }

  const [syncedTitle, setSyncedTitle] = useState(selfMember?.title ?? null);
  if ((selfMember?.title ?? null) !== syncedTitle) {
    setSyncedTitle(selfMember?.title ?? null);
    setTitle(selfMember?.title ?? "");
  }

  function defaultNotifPrefs(): Record<string, boolean> {
    return Object.fromEntries(NOTIFICATION_ITEMS.map((item) => [item.id, true]));
  }

  const [notifPrefs, setNotifPrefs] = useState<Record<string, boolean>>(defaultNotifPrefs);
  const [notifError, setNotifError] = useState<string | null>(null);

  // Same render-body "adjust state when a value changes" pattern as
  // syncedDisplayName/syncedTitle above — selfMember arrives asynchronously
  // once the workspace roster loads, so this can't be a plain useState
  // initializer, and this repo's set-state-in-effect lint rule forbids doing
  // it in a useEffect.
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

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !uid) return;
    setSaving(true);
    setProfileError(null);
    try {
      await updateDisplayName(user, name);
      await updateUserProfile(uid, { name, title });
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  }

  function handleCancelProfile() {
    setName(user?.displayName ?? "");
    setTitle(selfMember?.title ?? "");
    setProfileError(null);
  }

  return (
    <Tabs defaultValue="profile">
      <TabsList>
        <TabsTrigger value="profile">Profile</TabsTrigger>
        <TabsTrigger value="notifications">Notifications</TabsTrigger>
        <TabsTrigger value="appearance">Appearance</TabsTrigger>
      </TabsList>

      <TabsContent value="profile" className="mt-4">
        <form onSubmit={handleSaveProfile}>
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>Update your personal information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {profileSaved && (
                <div className="flex items-center gap-2 rounded-lg bg-success/10 px-4 py-2.5 text-sm text-success">
                  <CheckCircle2 className="size-4 shrink-0" />
                  Profile updated successfully.
                </div>
              )}
              {profileError && (
                <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
                  <AlertCircle className="size-4 shrink-0" />
                  {profileError}
                </div>
              )}
              <div className="flex items-center gap-4">
                <Avatar size="lg">
                  <AvatarFallback>{initials(name || "?")}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium text-foreground">{name}</p>
                  <p className="text-xs text-muted-foreground">{title}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Full name</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={user?.email ?? ""} disabled />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="title">Job title</Label>
                  <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="role">Role</Label>
                  <Input id="role" value={role ? ROLE_CAPS_LABEL[role] : "—"} disabled />
                  {role && <p className="text-xs text-muted-foreground">{ROLE_DISPLAY_LABELS[role]}</p>}
                </div>
                {organizationId && (
                  <div className="space-y-1.5">
                    <Label htmlFor="organization">Organization</Label>
                    <Input id="organization" value={organizationName ?? "Loading…"} disabled />
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={handleCancelProfile}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={saving}>
                {saving ? "Saving..." : "Save changes"}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </TabsContent>

      <TabsContent value="notifications" className="mt-4">
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
