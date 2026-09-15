"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  platformOrganizationFormSchema,
  type PlatformOrganizationFormValues,
} from "@/lib/validation/platform-organization.schema";

interface OrganizationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitOrg: (values: PlatformOrganizationFormValues) => void;
}

const defaultValues: PlatformOrganizationFormValues = {
  name: "",
  description: "",
  industry: "",
  contactEmail: "",
};

export function OrganizationFormDialog({ open, onOpenChange, onSubmitOrg }: OrganizationFormDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PlatformOrganizationFormValues>({
    resolver: zodResolver(platformOrganizationFormSchema),
    defaultValues,
  });

  function handleOpenChange(next: boolean) {
    if (!next) reset(defaultValues);
    onOpenChange(next);
  }

  function onSubmit(values: PlatformOrganizationFormValues) {
    onSubmitOrg(values);
    reset(defaultValues);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add Organization</DialogTitle>
          <DialogDescription>Onboard a new organization to the TASKORA platform. It starts on a 15-day free trial.</DialogDescription>
        </DialogHeader>

        <form id="org-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="new-org-name">Organization name</Label>
            <Input id="new-org-name" placeholder="e.g. Acme Robotics" {...register("name")} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-org-description">Description</Label>
            <Textarea id="new-org-description" rows={3} placeholder="What does this organization do?" {...register("description")} />
            {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-org-industry">Industry</Label>
            <Input id="new-org-industry" placeholder="e.g. Fintech" {...register("industry")} />
            {errors.industry && <p className="text-xs text-destructive">{errors.industry.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-org-email">Contact email</Label>
            <Input id="new-org-email" type="email" placeholder="ops@acme.com" {...register("contactEmail")} />
            {errors.contactEmail && <p className="text-xs text-destructive">{errors.contactEmail.message}</p>}
          </div>
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="org-form" disabled={isSubmitting}>
            {isSubmitting ? "Adding..." : "Add Organization"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
