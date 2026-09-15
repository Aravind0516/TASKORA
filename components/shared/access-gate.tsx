"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/auth-provider";
import { useOrganizationAccess } from "@/components/shared/use-organization-access";
import { hasPlatformAccess } from "@/lib/access-control";

const BILLING_PATH = "/admin/billing";

/**
 * The one place TASKORA's trial/subscription access restriction is actually
 * enforced in the UI — wraps the main content area of both the individual
 * (app) shell and the admin console (not Super Admin, which is never
 * org-scoped and always has access; see hasPlatformAccess()). Reads role/
 * organizationId from the REAL, claims-derived useAuth() — never the
 * dev-only demo role override — so a demo preview can never mask or fake
 * real access restriction, matching this app's existing "demo role never
 * affects actual data access" rule.
 *
 * The billing page itself is always reachable regardless of access state —
 * an organization must be able to see pricing and send a request even while
 * restricted, per the spec's own "user can still access the billing/
 * subscription area" requirement.
 */
export function AccessGate({ children }: { children: ReactNode }) {
  const { role, organizationId } = useAuth();
  const pathname = usePathname();
  const { organization, loading } = useOrganizationAccess(organizationId);

  if (role === "super_admin") return <>{children}</>;
  if (pathname === BILLING_PATH) return <>{children}</>;
  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  // No organization yet (self-registered, not-yet-invited account) — a
  // separate, already-handled state elsewhere (PlatformProvider's
  // hasNoOrganization banner); not this gate's concern.
  if (!organization) return <>{children}</>;
  if (hasPlatformAccess(organization, role)) return <>{children}</>;

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-4 text-center">
      <div className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Lock className="size-5" />
      </div>
      <p className="text-base font-medium text-foreground">Your free trial has ended.</p>
      {role === "admin" ? (
        <>
          <p className="max-w-sm text-sm text-muted-foreground">Choose a plan to continue using TASKORA.</p>
          <Button className="mt-1" render={<Link href={BILLING_PATH} />}>
            Go to Billing
          </Button>
        </>
      ) : (
        <p className="max-w-sm text-sm text-muted-foreground">
          Contact your organization administrator to choose a plan and continue using TASKORA.
        </p>
      )}
    </div>
  );
}
