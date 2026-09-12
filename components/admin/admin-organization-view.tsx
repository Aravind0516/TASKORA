"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Building2, CheckCircle2, Pencil } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { PersonStatusBadge } from "@/components/platform/person-status-badge";
import { formatDate } from "@/lib/format";
import { usePlatform } from "@/components/platform/platform-provider";

interface OrgFormValues {
  name: string;
  description: string;
  industry: string;
  contactEmail: string;
}

export function AdminOrganizationView() {
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const { currentOrganizationId, getOrganization, updateOrganization } = usePlatform();
  const org = getOrganization(currentOrganizationId);

  const { register, handleSubmit, reset } = useForm<OrgFormValues>({
    defaultValues: {
      name: org?.name ?? "",
      description: org?.description ?? "",
      industry: org?.industry ?? "",
      contactEmail: org?.contactEmail ?? "",
    },
  });

  useEffect(() => {
    const timeout = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(timeout);
  }, []);

  function handleOpenChange(next: boolean) {
    if (next && org) {
      reset({ name: org.name, description: org.description, industry: org.industry, contactEmail: org.contactEmail });
    }
    setEditOpen(next);
  }

  function onSubmit(values: OrgFormValues) {
    updateOrganization(currentOrganizationId, values);
    setEditOpen(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  if (loading || !org) {
    return (
      <div>
        <PageHeader title="Organization" description="Manage your organization's profile" />
        <Skeleton className="h-64 w-full max-w-2xl rounded-xl" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Organization"
        description="Manage your organization's profile"
        actions={
          <Button size="sm" onClick={() => handleOpenChange(true)}>
            <Pencil />
            Edit Organization
          </Button>
        }
      />

      {saved && (
        <div className="mb-5 flex items-center gap-2 rounded-lg bg-[#0ca30c]/10 px-4 py-2.5 text-sm text-[#0ca30c]">
          <CheckCircle2 className="size-4 shrink-0" />
          Organization updated.
        </div>
      )}

      <Card className="max-w-2xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Building2 className="size-5" />
            </div>
            <div>
              <CardTitle>{org.name}</CardTitle>
              <CardDescription>{org.industry}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-sm text-muted-foreground">{org.description}</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Contact Email</p>
              <p className="mt-1 text-sm text-foreground">{org.contactEmail}</p>
            </div>
            <div>
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Plan</p>
              <p className="mt-1 text-sm text-foreground">{org.plan}</p>
            </div>
            <div>
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Status</p>
              <div className="mt-1">
                <PersonStatusBadge status={org.status} />
              </div>
            </div>
            <div>
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Created</p>
              <p className="mt-1 text-sm text-foreground">{formatDate(org.createdAt)}</p>
            </div>
          </div>
        </CardContent>
        <CardFooter className="justify-end">
          <p className="text-xs text-muted-foreground">
            Platform-level controls (suspension, billing plan changes) are managed by TASKORA Super Admins.
          </p>
        </CardFooter>
      </Card>

      <Dialog open={editOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Organization</DialogTitle>
            <DialogDescription>Update your organization&apos;s profile information.</DialogDescription>
          </DialogHeader>
          <form id="edit-org-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="org-name">Organization name</Label>
              <Input id="org-name" {...register("name", { required: true })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="org-description">Description</Label>
              <Textarea id="org-description" rows={3} {...register("description")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="org-industry">Industry</Label>
              <Input id="org-industry" {...register("industry")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="org-email">Contact email</Label>
              <Input id="org-email" type="email" {...register("contactEmail")} />
            </div>
          </form>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" form="edit-org-form">
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
