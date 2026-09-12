"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Organization } from "@/types/platform";

const adminFormSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(60),
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email address"),
  organizationId: z.string().min(1, "Select an organization"),
});

type AdminFormValues = z.infer<typeof adminFormSchema>;

interface AdminFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitAdmin: (values: AdminFormValues) => void;
  organizations: Organization[];
}

const defaultValues: AdminFormValues = { name: "", email: "", organizationId: "" };

export function AdminFormDialog({ open, onOpenChange, onSubmitAdmin, organizations }: AdminFormDialogProps) {
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AdminFormValues>({ resolver: zodResolver(adminFormSchema), defaultValues });

  function handleOpenChange(next: boolean) {
    if (!next) reset(defaultValues);
    onOpenChange(next);
  }

  function onSubmit(values: AdminFormValues) {
    onSubmitAdmin(values);
    reset(defaultValues);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add Administrator</DialogTitle>
          <DialogDescription>Register a new organization administrator.</DialogDescription>
        </DialogHeader>
        <form id="admin-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="new-admin-name">Full name</Label>
            <Input id="new-admin-name" placeholder="e.g. Taylor Brooks" {...register("name")} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-admin-email">Email</Label>
            <Input id="new-admin-email" type="email" placeholder="taylor@company.com" {...register("email")} />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-admin-org">Organization</Label>
            <Controller
              control={control}
              name="organizationId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={(value) => field.onChange(value ?? "")}>
                  <SelectTrigger id="new-admin-org" className="w-full">
                    <SelectValue placeholder="Select an organization" />
                  </SelectTrigger>
                  <SelectContent>
                    {organizations.map((org) => (
                      <SelectItem key={org.id} value={org.id}>
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.organizationId && <p className="text-xs text-destructive">{errors.organizationId.message}</p>}
          </div>
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="admin-form" disabled={isSubmitting}>
            {isSubmitting ? "Adding..." : "Add Administrator"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
