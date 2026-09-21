"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { registerOrganizationSchema, type RegisterOrganizationFormValues } from "@/lib/validation/auth.schema";
import { submitOrganizationRegistration } from "@/lib/services/organization-registration.service";

const ORG_TYPES = ["Startup", "Small Business", "Enterprise", "Agency", "Educational Institution", "Non-Profit", "Other"];
const ORG_SIZES = ["1-10", "11-50", "51-200", "201-500", "500+"];
const NO_VALUE = "none";

interface RegisterOrganizationStepProps {
  onSubmitted: () => void;
}

/**
 * Step 2 of "Register a new organization" — collects organization details
 * and submits a review request (app/api/organization-registration), never
 * an active organization. See lib/server/organization-registrations.ts for
 * why this is deliberately NOT the same call as the old instant self-serve
 * claim.
 */
export function RegisterOrganizationStep({ onSubmitted }: RegisterOrganizationStepProps) {
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<RegisterOrganizationFormValues>({
    resolver: zodResolver(registerOrganizationSchema),
    defaultValues: {
      phone: "",
      organizationName: "",
      organizationType: "",
      industry: "",
      website: "",
      location: "",
      organizationSize: "",
      description: "",
    },
  });

  async function onSubmit(values: RegisterOrganizationFormValues) {
    setFormError(null);
    try {
      await submitOrganizationRegistration({
        phone: values.phone || undefined,
        organizationName: values.organizationName,
        organizationType: values.organizationType && values.organizationType !== NO_VALUE ? values.organizationType : undefined,
        industry: values.industry || undefined,
        website: values.website || undefined,
        location: values.location || undefined,
        organizationSize: values.organizationSize && values.organizationSize !== NO_VALUE ? values.organizationSize : undefined,
        description: values.description || undefined,
      });
      onSubmitted();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Something went wrong submitting your registration. Please try again.");
    }
  }

  return (
    <div>
      <div className="mb-6 text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Register your organization</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">Tell us about your organization — you&apos;ll be its administrator once approved.</p>
      </div>

      <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-info/30 bg-info/10 px-4 py-3 text-sm text-info">
        <Info className="mt-0.5 size-4 shrink-0" />
        <span>New organization registrations require Super Admin approval before the workspace becomes active.</span>
      </div>

      {formError && (
        <div role="alert" className="mb-5 flex items-start gap-2 rounded-lg bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="reg-phone">Phone (optional)</Label>
          <Input id="reg-phone" autoComplete="tel" {...register("phone")} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="reg-org-name">Organization name</Label>
          <Input id="reg-org-name" placeholder="e.g. Acme Inc" autoComplete="organization" {...register("organizationName")} />
          {errors.organizationName && <p className="text-xs text-destructive">{errors.organizationName.message}</p>}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="reg-org-type">Organization type</Label>
            <Controller
              control={control}
              name="organizationType"
              render={({ field }) => (
                <Select value={field.value || NO_VALUE} onValueChange={(v) => field.onChange(v === NO_VALUE ? "" : v)}>
                  <SelectTrigger id="reg-org-type" className="w-full">
                    <SelectValue placeholder="Select a type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_VALUE}>Not set</SelectItem>
                    {ORG_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reg-industry">Industry</Label>
            <Input id="reg-industry" placeholder="e.g. Software" {...register("industry")} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="reg-website">Website</Label>
            <Input id="reg-website" placeholder="https://..." {...register("website")} />
            {errors.website && <p className="text-xs text-destructive">{errors.website.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reg-location">Location</Label>
            <Input id="reg-location" placeholder="City, Country" {...register("location")} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="reg-org-size">Organization size</Label>
          <Controller
            control={control}
            name="organizationSize"
            render={({ field }) => (
              <Select value={field.value || NO_VALUE} onValueChange={(v) => field.onChange(v === NO_VALUE ? "" : v)}>
                <SelectTrigger id="reg-org-size" className="w-full">
                  <SelectValue placeholder="Select a size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_VALUE}>Not set</SelectItem>
                  {ORG_SIZES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s} people
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="reg-description">Purpose / description (optional)</Label>
          <Textarea id="reg-description" rows={3} placeholder="What will your team use TASKORA for?" {...register("description")} />
        </div>

        <Button type="submit" disabled={isSubmitting} className="mt-1.5 w-full">
          {isSubmitting ? "Submitting..." : "Submit Registration Request"}
        </Button>
      </form>
    </div>
  );
}
