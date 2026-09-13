"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerSchema, type RegisterFormValues } from "@/lib/validation/auth.schema";
import { registerWithEmail } from "@/lib/services/auth.service";
import { useAuth } from "@/components/auth/auth-provider";

interface RegisterFormProps {
  /** Step 1 only creates the Firebase account — it never decides where the
   * user lands. RegisterFlow (the step orchestrator) advances to the
   * workspace-creation step once a real, authenticated session exists. */
  onAccountCreated: () => void;
}

export function RegisterForm({ onAccountCreated }: RegisterFormProps) {
  // Same pattern as LoginForm: never advance off an independent identity
  // check — wait for AuthProvider's own context to reflect the new account
  // before telling the parent flow to move on, so the next step never runs
  // against a stale/unauthenticated session.
  const { user, loading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [awaitingSession, setAwaitingSession] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
  });

  const busy = isSubmitting || awaitingSession;

  async function onSubmit(values: RegisterFormValues) {
    setAuthError(null);
    try {
      await registerWithEmail(values.name, values.email, values.password);
      setAwaitingSession(true);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Something went wrong. Please try again.");
    }
  }

  useEffect(() => {
    if (!awaitingSession) return;
    if (loading) return;

    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      if (!user) {
        console.error("[register] Firebase Auth succeeded but no session resolved.");
        setAwaitingSession(false);
        setAuthError("We couldn't verify your session. Please sign in again.");
        return;
      }
      onAccountCreated();
    });
    return () => {
      cancelled = true;
    };
  }, [awaitingSession, loading, user, onAccountCreated]);

  return (
    <div>
      <div className="mb-7 text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Create your account</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">Start managing your work, projects and teams in one place.</p>
      </div>

      {authError && (
        <div role="alert" className="mb-5 flex items-start gap-2 rounded-lg bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{authError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">Full name</Label>
          <Input
            id="name"
            placeholder="Enter your full name"
            autoComplete="name"
            aria-invalid={errors.name ? "true" : undefined}
            aria-describedby={errors.name ? "name-error" : undefined}
            {...register("name")}
          />
          {errors.name && (
            <p id="name-error" className="text-xs text-destructive">
              {errors.name.message}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">Work email</Label>
          <Input
            id="email"
            type="email"
            placeholder="Enter your work email"
            autoComplete="email"
            aria-invalid={errors.email ? "true" : undefined}
            aria-describedby={errors.email ? "email-error" : undefined}
            {...register("email")}
          />
          {errors.email && (
            <p id="email-error" className="text-xs text-destructive">
              {errors.email.message}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Create a password"
              autoComplete="new-password"
              className="pr-9"
              aria-invalid={errors.password ? "true" : undefined}
              aria-describedby={errors.password ? "password-error" : undefined}
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute inset-y-0 right-0 flex items-center px-2.5 text-muted-foreground transition-colors hover:text-foreground"
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {errors.password && (
            <p id="password-error" className="text-xs text-destructive">
              {errors.password.message}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirm-password">Confirm password</Label>
          <Input
            id="confirm-password"
            type={showPassword ? "text" : "password"}
            placeholder="Re-enter your password"
            autoComplete="new-password"
            aria-invalid={errors.confirmPassword ? "true" : undefined}
            aria-describedby={errors.confirmPassword ? "confirm-password-error" : undefined}
            {...register("confirmPassword")}
          />
          {errors.confirmPassword && (
            <p id="confirm-password-error" className="text-xs text-destructive">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        <Button type="submit" disabled={busy} className="mt-1.5 w-full">
          {busy && <Loader2 className="size-4 animate-spin" />}
          {isSubmitting ? "Creating account..." : awaitingSession ? "Creating account..." : "Continue"}
        </Button>
      </form>

      <div className="mt-6 border-t border-border pt-5 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Log in
        </Link>
      </div>
    </div>
  );
}
