"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle } from "lucide-react";
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
import { editProfileSchema, type EditProfileFormValues } from "@/lib/validation/edit-profile.schema";
import { updateMyProfile } from "@/lib/services/user.service";
import { updateDisplayName } from "@/lib/services/auth.service";
import { useAuth } from "@/components/auth/auth-provider";
import { DOMAIN_OPTIONS } from "@/types/candidate";
import type { UserRecord } from "@/types/user";

const NO_DOMAIN = "none";

interface EditProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserRecord;
  onSaved: () => void;
}

/**
 * Every field here maps 1:1 to firestore.rules' users/{uid} self-edit
 * allow-list (isSelf branch) — Candidate ID, role, team, project, and
 * account status are never rendered here because they are never in that
 * allow-list, not because the UI merely hides them.
 */
export function EditProfileDialog({ open, onOpenChange, user, onSaved }: EditProfileDialogProps) {
  const { user: authUser } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<EditProfileFormValues>({
    resolver: zodResolver(editProfileSchema),
    defaultValues: {
      name: user.name ?? "",
      title: user.title ?? "",
      phone: user.phone ?? "",
      address: user.address ?? "",
      collegeName: user.collegeName ?? "",
      branch: user.branch ?? "",
      passedOutYear: user.passedOutYear ? String(user.passedOutYear) : "",
      academicYear: user.academicYear ?? "",
      domain: user.domain ?? "",
      secondaryDomain: user.secondaryDomain ?? "",
      linkedinUrl: user.linkedinUrl ?? "",
      githubUrl: user.githubUrl ?? "",
      portfolioUrl: user.portfolioUrl ?? "",
    },
  });

  async function onSubmit(values: EditProfileFormValues) {
    setFormError(null);
    try {
      // Keep Firebase Auth's own displayName (read by the topbar/sidebar
      // account menu via useAuth()) in sync with the Firestore profile name
      // — previously only Settings' now-removed duplicate Profile tab did
      // this, so editing your name here alone would leave the header/
      // dropdown showing a stale name until next login.
      if (authUser && values.name !== user.name) {
        await updateDisplayName(authUser, values.name);
      }
      await updateMyProfile(user.id, {
        name: values.name,
        title: values.title || undefined,
        phone: values.phone || undefined,
        address: values.address || undefined,
        collegeName: values.collegeName || undefined,
        branch: values.branch || undefined,
        passedOutYear: values.passedOutYear ? Number(values.passedOutYear) : undefined,
        academicYear: values.academicYear || undefined,
        domain: values.domain && values.domain !== NO_DOMAIN ? values.domain : undefined,
        secondaryDomain: values.secondaryDomain && values.secondaryDomain !== NO_DOMAIN ? values.secondaryDomain : undefined,
        linkedinUrl: values.linkedinUrl || undefined,
        githubUrl: values.githubUrl || undefined,
        portfolioUrl: values.portfolioUrl || undefined,
      });
      onSaved();
      onOpenChange(false);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Something went wrong saving your profile. Please try again.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
          <DialogDescription>Update your personal, academic, and link details.</DialogDescription>
        </DialogHeader>

        <form id="edit-profile-form" onSubmit={handleSubmit(onSubmit)} className="max-h-[65vh] space-y-4 overflow-y-auto pr-1">
          {formError && (
            <div className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-profile-name">Full name</Label>
              <Input id="edit-profile-name" {...register("name")} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-profile-title">Job title</Label>
              <Input id="edit-profile-title" {...register("title")} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-profile-phone">Phone</Label>
              <Input id="edit-profile-phone" {...register("phone")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-profile-address">Address</Label>
              <Input id="edit-profile-address" {...register("address")} />
            </div>
          </div>

          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Academic / professional</p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-profile-college">College</Label>
              <Input id="edit-profile-college" {...register("collegeName")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-profile-branch">Branch</Label>
              <Input id="edit-profile-branch" {...register("branch")} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-profile-year">Passed out year</Label>
              <Input id="edit-profile-year" type="number" placeholder="2026" {...register("passedOutYear")} />
              {errors.passedOutYear && <p className="text-xs text-destructive">{errors.passedOutYear.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-profile-domain">Domain</Label>
              <Controller
                control={control}
                name="domain"
                render={({ field }) => (
                  <Select value={field.value || NO_DOMAIN} onValueChange={(v) => field.onChange(v === NO_DOMAIN ? "" : v)} items={{ [NO_DOMAIN]: "Not set", ...Object.fromEntries(DOMAIN_OPTIONS.map((d) => [d.value, d.label])) }}>
                    <SelectTrigger id="edit-profile-domain" className="w-full">
                      <SelectValue placeholder="Select a domain" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_DOMAIN}>Not set</SelectItem>
                      {DOMAIN_OPTIONS.map((d) => (
                        <SelectItem key={d.value} value={d.value}>
                          {d.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Professional links</p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-profile-linkedin">LinkedIn</Label>
              <Input id="edit-profile-linkedin" placeholder="https://linkedin.com/in/..." {...register("linkedinUrl")} />
              {errors.linkedinUrl && <p className="text-xs text-destructive">{errors.linkedinUrl.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-profile-github">GitHub</Label>
              <Input id="edit-profile-github" placeholder="https://github.com/..." {...register("githubUrl")} />
              {errors.githubUrl && <p className="text-xs text-destructive">{errors.githubUrl.message}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-profile-portfolio">Portfolio</Label>
            <Input id="edit-profile-portfolio" placeholder="https://..." {...register("portfolioUrl")} />
            {errors.portfolioUrl && <p className="text-xs text-destructive">{errors.portfolioUrl.message}</p>}
          </div>
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="edit-profile-form" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
