"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, CheckCircle2, LayoutGrid, ShieldAlert, Users as UsersIcon, XCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AcceptInvitationForm } from "@/components/invitations/accept-invitation-form";
import { getPublicInvitation, acceptInvitation as acceptInvitationRequest } from "@/lib/services/invitation.service";
import { loginWithEmail } from "@/lib/services/auth.service";
import { resolvePostAuthPath } from "@/lib/auth-redirect";
import type { ActivateAccountFormValues } from "@/lib/validation/activate-account.schema";
import type { PublicInvitationView } from "@/types/invitation";

type Stage = "checking" | "summary" | "form" | "activated";

function BrandMark() {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <LayoutGrid className="size-5" />
      </div>
      <div className="leading-tight">
        <p className="text-base font-semibold tracking-tight text-foreground">TASKORA</p>
        <p className="text-xs text-muted-foreground">Workflow Platform</p>
      </div>
    </Link>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-background px-4 py-12">
      <BrandMark />
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}

export function InviteLandingView({ token }: { token: string }) {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("checking");
  const [invitation, setInvitation] = useState<PublicInvitationView | null>(null);
  const [continuePath, setContinuePath] = useState("/login");

  useEffect(() => {
    let cancelled = false;
    getPublicInvitation(token)
      .then(({ invitation: view }) => {
        if (cancelled) return;
        setInvitation(view);
        setStage("summary");
      })
      .catch(() => {
        if (cancelled) return;
        setInvitation(null);
        setStage("summary");
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (stage === "checking") {
    return (
      <Shell>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-56" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </Shell>
    );
  }

  if (!invitation) {
    return (
      <Shell>
        <Card>
          <CardHeader className="items-center text-center">
            <XCircle className="mb-2 size-10 text-muted-foreground" />
            <CardTitle>Invitation unavailable</CardTitle>
            <CardDescription>This invitation link is invalid. Ask your administrator to send a new one.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => router.push("/")}>
              Back to TASKORA
            </Button>
          </CardContent>
        </Card>
      </Shell>
    );
  }

  if (invitation.status === "cancelled") {
    return (
      <Shell>
        <Card>
          <CardHeader className="items-center text-center">
            <XCircle className="mb-2 size-10 text-muted-foreground" />
            <CardTitle>Invitation cancelled</CardTitle>
            <CardDescription>This invitation was cancelled by your administrator. Ask them to send a new one.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => router.push("/")}>
              Back to TASKORA
            </Button>
          </CardContent>
        </Card>
      </Shell>
    );
  }

  if (invitation.status === "expired") {
    return (
      <Shell>
        <Card>
          <CardHeader className="items-center text-center">
            <ShieldAlert className="mb-2 size-10 text-amber-500" />
            <CardTitle>Invitation expired</CardTitle>
            <CardDescription>This invitation link has expired. Ask your administrator to resend it.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => router.push("/")}>
              Back to TASKORA
            </Button>
          </CardContent>
        </Card>
      </Shell>
    );
  }

  if (invitation.status === "accepted" && stage !== "activated") {
    return (
      <Shell>
        <Card>
          <CardHeader className="items-center text-center">
            <CheckCircle2 className="mb-2 size-10 text-emerald-500" />
            <CardTitle>Account already activated</CardTitle>
            <CardDescription>This invitation has already been accepted. Log in with your email and password.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => router.push("/login")}>
              Go to login
            </Button>
          </CardContent>
        </Card>
      </Shell>
    );
  }

  if (stage === "activated") {
    return (
      <Shell>
        <Card>
          <CardHeader className="items-center text-center">
            <CheckCircle2 className="mb-2 size-10 text-emerald-500" />
            <CardTitle>Welcome to TASKORA</CardTitle>
            <CardDescription>Your account is active and you&apos;re signed in.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => router.push(continuePath)}>
              Continue to TASKORA
            </Button>
          </CardContent>
        </Card>
      </Shell>
    );
  }

  const inviteDetails = (
    <div className="space-y-2 rounded-lg border border-border p-4 text-sm">
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Building2 className="size-4" />
          Organization
        </span>
        <span className="font-medium text-foreground">{invitation.organizationName}</span>
      </div>
      {invitation.teamName && (
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <UsersIcon className="size-4" />
            Team
          </span>
          <span className="font-medium text-foreground">{invitation.teamName}</span>
        </div>
      )}
      <div className="flex items-center justify-between gap-3">
        <span className="text-muted-foreground">Role</span>
        <span className="font-medium text-foreground capitalize">{invitation.role}</span>
      </div>
    </div>
  );

  async function handleActivate(values: ActivateAccountFormValues) {
    await acceptInvitationRequest({ token, name: values.name, password: values.password });

    // The Firebase Auth account now genuinely exists (created server-side) —
    // sign the browser into it immediately so "Continue to TASKORA" lands on
    // a real, already-authenticated session rather than sending them back
    // through the login form a second time.
    try {
      const user = await loginWithEmail(values.email, values.password);
      const path = await resolvePostAuthPath(user);
      setContinuePath(path);
    } catch {
      setContinuePath("/login");
    }
    setStage("activated");
  }

  if (stage === "form") {
    return (
      <Shell>
        <Card>
          <CardHeader className="items-center text-center">
            <CardTitle>Activate your account</CardTitle>
            <CardDescription>Set a password to finish joining {invitation.organizationName}.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {inviteDetails}
            <AcceptInvitationForm name={invitation.name} email={invitation.email} onActivate={handleActivate} />
          </CardContent>
        </Card>
      </Shell>
    );
  }

  return (
    <Shell>
      <Card>
        <CardHeader className="items-center text-center">
          <CardTitle>You&apos;re invited to TASKORA</CardTitle>
          <CardDescription>{invitation.organizationName} invited you to join their workspace.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {inviteDetails}
          <Button className="w-full" onClick={() => setStage("form")}>
            Accept Invitation
          </Button>
        </CardContent>
      </Card>
    </Shell>
  );
}
