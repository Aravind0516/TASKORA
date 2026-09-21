"use client";

import { useEffect, useState } from "react";
import { IdCard, Pencil, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAuth } from "@/components/auth/auth-provider";
import * as userService from "@/lib/services/user.service";
import * as organizationService from "@/lib/services/organization.service";
import { ROLE_DISPLAY_LABELS } from "@/lib/platform/constants";
import { formatDate } from "@/lib/format";
import type { UserRecord } from "@/types/user";
import type { OrganizationDoc } from "@/types/organization";

/**
 * The Organization Administrator / Super Admin's OWN account identity — a
 * deliberately different page from the candidate/employee "My Profile"
 * (components/candidate/my-profile-view.tsx), not that page reused with
 * different data. An administrator is not a candidate: this page never
 * renders Candidate ID, College, Branch, Passed Out Year, Domain, or any
 * other candidate/employee-shaped field, and it never asks for them either
 * — see EditAdminAccountDialog below, whose editable field set is a small,
 * fixed subset (name, title, phone) chosen specifically because those are
 * the only fields that make sense for an administrator's own identity.
 * Reuses the exact same self-edit service (updateMyProfile) and the exact
 * same firestore.rules boundary the candidate profile already uses — this
 * is a different UI over the same trusted write path, not a second one.
 */
export function AdminAccountView() {
  const { user: authUser, role, organizationId } = useAuth();
  const [record, setRecord] = useState<UserRecord | null | undefined>(undefined);
  const [organization, setOrganization] = useState<OrganizationDoc | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    if (!authUser) return;
    return userService.subscribeToUser(authUser.uid, setRecord, () => setRecord(null));
  }, [authUser]);

  useEffect(() => {
    if (!organizationId) {
      let cancelled = false;
      Promise.resolve().then(() => !cancelled && setOrganization(null));
      return () => {
        cancelled = true;
      };
    }
    return organizationService.subscribeToOrganization(organizationId, setOrganization, () => setOrganization(null));
  }, [organizationId]);

  const title = role === "super_admin" ? "Platform Owner Account" : "Administrator Account";
  const description =
    role === "super_admin"
      ? "Your own platform-owner identity — not a candidate or organization profile."
      : "Your own administrator identity for this organization — not a candidate profile.";

  return (
    <div>
      <PageHeader title={title} description={description} />

      {record === undefined ? (
        <Skeleton className="h-72 w-full max-w-2xl rounded-xl" />
      ) : !record || !authUser ? (
        <EmptyState icon={IdCard} title="Account unavailable" description="We couldn't load your account right now." />
      ) : (
        <div className="max-w-2xl space-y-6">
          <Card>
            <CardContent className="flex flex-col items-center gap-3 px-5 py-7 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
              <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center">
                <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
                  {(record.name || record.email).slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <p className="text-base font-semibold text-foreground">{record.name || "(No name)"}</p>
                  <p className="text-sm text-muted-foreground">{record.email}</p>
                  <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                    <ShieldCheck className="size-3.5" /> {role ? ROLE_DISPLAY_LABELS[role] : "Administrator"}
                  </p>
                </div>
              </div>
              <Button size="sm" onClick={() => setEditOpen(true)}>
                <Pencil />
                Edit Account
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Personal / Account Identity</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
              <Field label="Full Name" value={record.name} />
              <Field label="Login Email" value={record.email} hint="Read-only — managed by Firebase Authentication" />
              <Field label="Phone" value={record.phone} />
              <Field label="Job Title / Designation" value={record.title} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Administrative Context</CardTitle>
              <CardDescription>Controlled by the platform — not editable from this page</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
              <Field label="Organization Name" value={organization?.name ?? (role === "super_admin" ? "— (platform-wide)" : undefined)} />
              <Field label="Organization ID" value={organizationId ?? undefined} />
              <Field label="Administrator Role" value={role ? ROLE_DISPLAY_LABELS[role] : undefined} />
              <Field label="Account Status" value={record.status} />
              <Field label="Joined" value={formatDate(record.createdAt)} />
              <Field
                label="Last Login"
                value={authUser.metadata.lastSignInTime ? formatDate(new Date(authUser.metadata.lastSignInTime).toISOString()) : undefined}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Security</CardTitle>
              <CardDescription>Authentication for this account is managed by Firebase Authentication</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              To change your password, use &ldquo;Forgot password&rdquo; from the login page while signed out, or contact
              platform support.
            </CardContent>
          </Card>
        </div>
      )}

      {record && (
        <EditAdminAccountDialog key={record.updatedAt} open={editOpen} onOpenChange={setEditOpen} record={record} />
      )}
    </div>
  );
}

function Field({ label, value, hint }: { label: string; value?: string; hint?: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-foreground">{value || "—"}</p>
      {hint && <p className="mt-0.5 text-[11px] text-muted-foreground/70">{hint}</p>}
    </div>
  );
}

interface EditAdminAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: UserRecord;
}

/**
 * Deliberately three fields only — name, title, phone. No Candidate ID, no
 * organization fields, no role, no status: none of those are ever editable
 * by the account itself, matching firestore.rules' self-edit allow-list
 * exactly (which is the actual enforcement boundary, not this dialog).
 */
function EditAdminAccountDialog({ open, onOpenChange, record }: EditAdminAccountDialogProps) {
  const [name, setName] = useState(record.name);
  const [title, setTitle] = useState(record.title ?? "");
  const [phone, setPhone] = useState(record.phone ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleOpenChange(next: boolean) {
    if (next) {
      setName(record.name);
      setTitle(record.title ?? "");
      setPhone(record.phone ?? "");
      setError(null);
    }
    onOpenChange(next);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) {
      setError("Name must be at least 2 characters.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await userService.updateMyProfile(record.id, {
        name: name.trim(),
        title: title.trim() || undefined,
        phone: phone.trim() || undefined,
      });
      handleOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save your account.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit account</DialogTitle>
          <DialogDescription>Update your name, title, and phone number.</DialogDescription>
        </DialogHeader>
        <form id="edit-admin-account-form" onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="space-y-1.5">
            <Label htmlFor="admin-account-name">Full name</Label>
            <Input id="admin-account-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="admin-account-title">Job title / designation</Label>
            <Input id="admin-account-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Operations Head" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="admin-account-phone">Phone</Label>
            <Input id="admin-account-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="edit-admin-account-form" disabled={saving}>
            {saving ? "Saving..." : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
