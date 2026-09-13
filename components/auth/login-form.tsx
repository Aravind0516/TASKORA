"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { loginSchema, type LoginFormValues } from "@/lib/validation/auth.schema";
import { loginWithEmail, setRememberMe } from "@/lib/services/auth.service";
import { useAuth } from "@/components/auth/auth-provider";
import { ROLE_HOME_PATH } from "@/lib/platform/constants";

/**
 * The one canonical login screen — rendered at /login only (no dialog, no
 * role-selection step). The role that decides where this lands is never
 * chosen on this screen: it's resolved after real Firebase authentication,
 * from the signed-in account's actual ID token claims (see useAuth() /
 * AuthProvider), never from anything client-supplied.
 */
export function LoginForm() {
  const router = useRouter();
  // The single authoritative session — never resolve role independently and
  // navigate off that side channel. Route guards on the destination page
  // (AdminRoute, ProtectedRoute, SuperAdminRoute) all read this exact same
  // context; navigating before IT has caught up with the new sign-in risks
  // the destination guard still seeing a stale `user: null` for one render
  // and bouncing back to /login. Waiting for `loading` to clear here, on the
  // same context, guarantees the destination page never sees a stale value.
  const { user, role, loading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMeChecked] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [awaitingSession, setAwaitingSession] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const busy = isSubmitting || awaitingSession;

  async function onSubmit(values: LoginFormValues) {
    setAuthError(null);
    try {
      await setRememberMe(rememberMe);
      await loginWithEmail(values.email, values.password);
      // Firebase Auth succeeded — don't navigate yet. Flip to "waiting for
      // AuthProvider" mode; the effect below redirects once that context has
      // genuinely caught up and resolved the real role.
      setAwaitingSession(true);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Something went wrong. Please try again.");
    }
  }

  useEffect(() => {
    if (!awaitingSession) return;
    if (loading) return; // AuthProvider still resolving auth state and/or claims — keep waiting, do not redirect anywhere yet.

    // Deferred so this never calls setState synchronously inside the effect
    // body — same async pattern used everywhere else in this app. It also
    // has a real purpose here: it lets this effect's own cleanup (the
    // `cancelled` flag) guard against a stale run if state changes again
    // before this microtask fires.
    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;

      if (!user || !role) {
        // Firebase Auth reported success but AuthProvider never resolved a
        // user/role — a genuine, unusual failure, not a normal "not logged
        // in yet" moment (loading is already false here). Log the detail for
        // developers, show only the clean message to the user.
        console.error("[login] Firebase Auth succeeded but no session/role resolved.", { hasUser: Boolean(user), role });
        setAwaitingSession(false);
        setAuthError("We couldn't verify your session. Please try signing in again.");
        return;
      }

      router.replace(ROLE_HOME_PATH[role]);
    });

    return () => {
      cancelled = true;
    };
  }, [awaitingSession, loading, user, role, router]);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-[1.75rem]">Welcome back</h1>
        <p className="mt-2 text-sm text-muted-foreground">Sign in to continue to your workspace.</p>
      </div>

      {authError && (
        <div role="alert" className="mb-6 flex items-start gap-2 rounded-lg bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{authError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="email">Work email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@company.com"
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
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link href="/forgot-password" className="text-xs font-medium text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              autoComplete="current-password"
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

        <label className="flex items-center gap-2 text-sm text-foreground">
          <Checkbox checked={rememberMe} onCheckedChange={(checked) => setRememberMeChecked(Boolean(checked))} />
          Remember me
        </label>

        <Button type="submit" disabled={busy} className="w-full">
          {busy && <Loader2 className="size-4 animate-spin" />}
          {isSubmitting ? "Signing in..." : awaitingSession ? "Loading your account..." : "Sign in"}
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
          Get started
          <ArrowRight className="size-3.5" />
        </Link>
      </p>
    </div>
  );
}
