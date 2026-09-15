"use client";

import { useEffect, useState } from "react";
import { subscribeToOrganization } from "@/lib/services/organization.service";
import type { OrganizationDoc } from "@/types/organization";

interface OrganizationAccessState {
  organization: OrganizationDoc | null;
  loading: boolean;
}

/**
 * A single, shared subscription to the signed-in account's own organization
 * document — used only for trial/subscription access-gating (see
 * lib/access-control.ts). Deliberately independent of WorkspaceProvider
 * (the individual-contributor shell never otherwise loads the organization
 * doc at all) and of PlatformProvider (which already loads it, but as part
 * of a much larger admin/superadmin data set) — this keeps the org-access
 * concern in exactly one small, reusable place per "do not scatter
 * independent plan checks throughout the application," usable by both
 * shells without either one taking on the other's data-loading shape.
 */
export function useOrganizationAccess(organizationId: string | null): OrganizationAccessState {
  const [organization, setOrganization] = useState<OrganizationDoc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!organizationId) {
      // Deferred so this never calls setState synchronously inside the
      // effect body — same async pattern used elsewhere in this app (e.g.
      // AuthProvider's identity-clearing effect) for clearing state when a
      // dependency goes away.
      let cancelled = false;
      Promise.resolve().then(() => {
        if (cancelled) return;
        setOrganization(null);
        setLoading(false);
      });
      return () => {
        cancelled = true;
      };
    }
    const unsubscribe = subscribeToOrganization(
      organizationId,
      (org) => {
        setOrganization(org);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return unsubscribe;
  }, [organizationId]);

  return { organization, loading };
}
