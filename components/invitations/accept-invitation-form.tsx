"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { activateAccountSchema, type ActivateAccountFormValues } from "@/lib/validation/activate-account.schema";

interface AcceptInvitationFormProps {
  name: string;
  email: string;
  onActivate: (values: ActivateAccountFormValues) => Promise<void> | void;
}

export function AcceptInvitationForm({ name, email, onActivate }: AcceptInvitationFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ActivateAccountFormValues>({
    resolver: zodResolver(activateAccountSchema),
    defaultValues: { name, email, password: "", confirmPassword: "" },
  });

  async function onSubmit(values: ActivateAccountFormValues) {
    setFormError(null);
    try {
      await onActivate(values);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Something went wrong activating your account. Please try again.");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {formError && (
        <div className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="activate-name">Full name</Label>
        <Input id="activate-name" autoComplete="name" {...register("name")} />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="activate-email">Email</Label>
        <Input id="activate-email" type="email" readOnly disabled {...register("email")} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="activate-password">Password</Label>
        <div className="relative">
          <Input
            id="activate-password"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            autoComplete="new-password"
            className="pr-9"
            {...register("password")}
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute inset-y-0 right-0 flex items-center px-2.5 text-muted-foreground hover:text-foreground"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
        {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="activate-confirm">Confirm password</Label>
        <Input
          id="activate-confirm"
          type={showPassword ? "text" : "password"}
          placeholder="••••••••"
          autoComplete="new-password"
          {...register("confirmPassword")}
        />
        {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>}
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "Activating..." : "Activate Account"}
      </Button>
    </form>
  );
}
