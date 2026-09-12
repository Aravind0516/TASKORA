"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, ArrowLeft, Eye, EyeOff } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { loginSchema, type LoginFormValues } from "@/lib/validation/auth.schema";
import { loginWithEmail, logout, setRememberMe } from "@/lib/services/auth.service";
import { useAuth } from "@/components/auth/auth-provider";
import { getDemoEmailHint } from "@/lib/platform/demo-credentials";
import { ROLE_CAPS_LABEL, ROLE_DISPLAY_LABELS, ROLE_HOME_PATH } from "@/lib/platform/constants";
import type { PlatformRole } from "@/types/platform";

interface LoginFormProps {
  /** The role selected on the previous step — the login attempt is only accepted if the account's real role matches this. */
  expectedRole: PlatformRole;
  /** Returns to the role-selection step. */
  onChangeRole: () => void;
  /** Overrides the "Forgot password?" link — used when embedded in a dialog. */
  onForgotPasswordClick?: () => void;
  /** Overrides the "Register" link — used when embedded in a dialog. */
  onRegisterClick?: () => void;
}

export function LoginForm({ expectedRole, onChangeRole, onForgotPasswordClick, onRegisterClick }: LoginFormProps) {
  const router = useRouter();
  // The single authoritative session — never resolve role independently and
  // navigate off that side channel. Route guards on the destination page
  // (AdminRoute, ProtectedRoute, SuperAdminRoute) all read this exact same
  // context; navigating before IT has caught up with the new sign-in is
  // what caused the "login immediately bounces back to /login" bug — the
  // guard would still see the previous, stale `user: null` for one render
  // and redirect away before AuthProvider's own onAuthStateChanged listener
  // had a chance to update it. Waiting for `loading` to clear here, on the
  // same context, guarantees the destination page never sees a stale value.
  const { user, role, loading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMeChecked] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [awaitingSession, setAwaitingSession] = useState(false);
  const demoEmailHint = getDemoEmailHint(expectedRole);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: demoEmailHint ?? "", password: "" },
  });

  async function onSubmit(values: LoginFormValues) {
    setAuthError(null);
    try {
      await setRememberMe(rememberMe);
      await loginWithEmail(values.email, values.password);
      // Firebase Auth succeeded — don't navigate yet. Flip to "waiting for
      // AuthProvider" mode; the effect below does the role check and
      // redirect once that context has genuinely caught up.
      setAwaitingSession(true);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Something went wrong. Please try again.");
    }
  }

  useEffect(() => {
    if (!awaitingSession) return;
    if (loading) return; // AuthProvider still resolving auth state and/or claims for the new user — keep waiting, do not redirect anywhere yet.

    // Deferred so this never calls setState synchronously inside the effect
    // body — same async pattern used everywhere else in this app. It also
    // has a real purpose here, not just lint-satisfaction: it lets this
    // effect's own cleanup (the `cancelled` flag) guard against a stale
    // run if awaitingSession/loading/user/role change again before this
    // microtask fires.
    let cancelled = false;
    Promise.resolve().then(async () => {
      if (cancelled) return;

      if (!user) {
        // Firebase Auth reported success but AuthProvider never picked up a
        // user — a genuine, unusual failure, not a normal "not logged in
        // yet" moment (loading is already false here). Show it, don't
        // silently bounce to login.
        setAwaitingSession(false);
        setAuthError("Authentication succeeded, but TASKORA could not establish your session. Please try again.");
        return;
      }

      if (role !== expectedRole) {
        setAwaitingSession(false);
        const actualRole = role ?? "user";
        const actualLabel = ROLE_CAPS_LABEL[actualRole];
        await logout();
        if (cancelled) return;
        if (expectedRole !== "user" && actualRole === "user") {
          // The single most common cause of this exact mismatch: someone
          // edited this account's users/{uid}.role field in Firestore
          // Console expecting that to grant Admin/Super Admin access. It
          // never does — that field is display-only. Real role only ever
          // comes from a Firebase Auth custom claim, set by an Admin-SDK
          // operation (the invitation-acceptance flow, the bootstrap
          // scripts, or the self-serve "Create Organization" flow) — never
          // a client-editable document. Say so plainly instead of leaving
          // this as a silent, confusing rejection.
          setAuthError(
            `These credentials belong to a ${actualLabel} account. This account has not been granted real Admin/Super Admin access yet — editing its Firestore profile does not do this. Log in with User Login instead, then use the Demo menu to preview Admin and click "Create Organization" to grant this account real Admin access, or have a Super Admin invite it, or run the bootstrap script.`
          );
        } else {
          setAuthError(`These credentials belong to a ${actualLabel} account. Please select ${actualLabel} and try again.`);
        }
        return;
      }

      router.replace(ROLE_HOME_PATH[expectedRole]);
    });

    return () => {
      cancelled = true;
    };
  }, [awaitingSession, loading, user, role, expectedRole, router]);

  return (
    <Card>
      <CardHeader>
        <button
          type="button"
          onClick={onChangeRole}
          className="mb-1 flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Change role
        </button>
        <CardTitle className="flex items-baseline gap-2">
          <span className="text-xs font-semibold tracking-wide text-primary">{ROLE_CAPS_LABEL[expectedRole]}</span>
        </CardTitle>
        <CardDescription>{ROLE_DISPLAY_LABELS[expectedRole]}</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <CardContent className="space-y-4">
          {authError && (
            <div className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@company.com"
              autoComplete="email"
              {...register("email")}
            />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            {demoEmailHint && (
              <p className="text-xs text-muted-foreground">Demo tip: use {demoEmailHint} for this role.</p>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              {onForgotPasswordClick ? (
                <button
                  type="button"
                  onClick={onForgotPasswordClick}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Forgot password?
                </button>
              ) : (
                <Link href="/forgot-password" className="text-xs font-medium text-primary hover:underline">
                  Forgot password?
                </Link>
              )}
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                autoComplete="current-password"
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

          <label className="flex items-center gap-2 text-sm text-foreground">
            <Checkbox checked={rememberMe} onCheckedChange={(checked) => setRememberMeChecked(Boolean(checked))} />
            Remember me
          </label>
        </CardContent>

        <CardFooter className="flex-col items-stretch gap-4">
          <Button type="submit" disabled={isSubmitting || awaitingSession} className="w-full">
            {isSubmitting ? "Logging in..." : awaitingSession ? "Loading your account..." : "Log in"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            {onRegisterClick ? (
              <button type="button" onClick={onRegisterClick} className="font-medium text-primary hover:underline">
                Register
              </button>
            ) : (
              <Link href="/register" className="font-medium text-primary hover:underline">
                Register
              </Link>
            )}
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
