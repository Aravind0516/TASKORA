"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { Clock3, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/auth-provider";
import * as organizationRegistrationService from "@/lib/services/organization-registration.service";
import { formatDate } from "@/lib/format";
import type { OrganizationRegistrationRequest } from "@/types/organization-registration";

/**
 * Renders instead of the (app) shell's normal page content whenever the
 * signed-in account is org-less AND has a submitted organization
 * registration request still PENDING or REJECTED — see Section 9/10 of the
 * registration-architecture request: "do not show an empty organization
 * dashboard." Skipped entirely for Super Admin (never org-scoped) or any
 * account whose claims already carry a real organizationId (a normal,
 * already-approved member — the common case). An org-less account with NO
 * registration request at all (e.g. a plain self-registration that never
 * went through "Register a new organization") falls through to children
 * unchanged — that pre-existing empty-workspace state isn't this gate's
 * concern.
 */
export function OrganizationRegistrationGate({ children }: { children: ReactNode }) {
  const { user, organizationId, role, loading: authLoading } = useAuth();
  const [request, setRequest] = useState<OrganizationRegistrationRequest | null | undefined>(undefined);

  const shouldCheck = !authLoading && !!user && !organizationId && role !== "super_admin";

  useEffect(() => {
    if (!shouldCheck || !user) {
      let cancelled = false;
      Promise.resolve().then(() => !cancelled && setRequest(undefined));
      return () => {
        cancelled = true;
      };
    }
    return organizationRegistrationService.subscribeToMyOrganizationRegistration(user.uid, setRequest, () => setRequest(null));
  }, [shouldCheck, user]);

  if (!shouldCheck) return <>{children}</>;
  if (request === undefined) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!request || request.status === "APPROVED") return <>{children}</>;

  if (request.status === "PENDING") {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-info/10 text-info">
          <Clock3 className="size-5" />
        </div>
        <div>
          <p className="text-base font-medium text-foreground">Registration Pending</p>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">
            Your organization registration is currently awaiting Super Admin approval. You&apos;ll be notified as soon as it&apos;s reviewed.
          </p>
        </div>
        <div className="w-full max-w-xs space-y-2 rounded-lg border border-border bg-surface-muted px-4 py-3.5 text-left text-sm">
          <Row label="Organization" value={request.organizationName} />
          <Row label="Status" value="Pending review" />
          <Row label="Submitted" value={formatDate(request.submittedAt)} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-danger/10 text-danger">
        <XCircle className="size-5" />
      </div>
      <div>
        <p className="text-base font-medium text-foreground">Registration Not Approved</p>
        <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">
          {request.reviewerComment || "Your organization registration was not approved."}
        </p>
      </div>
      <Button variant="outline" size="sm" nativeButton={false} render={<Link href="mailto:support@nxtwise.com" />}>
        Contact Support
      </Button>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}
