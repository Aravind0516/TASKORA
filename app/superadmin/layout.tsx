import type { ReactNode } from "react";
import { SuperAdminRoute } from "@/components/auth/super-admin-route";
import { PlatformProvider } from "@/components/platform/platform-provider";
import { WorkspaceProvider } from "@/components/workspace/workspace-provider";
import { PlatformShell } from "@/components/platform/platform-shell";

// See app/admin/layout.tsx for why WorkspaceProvider is added here — same
// reasoning. A Super Admin has no single organizationId, so WorkspaceProvider
// falls into its existing "no organization yet" branch (empty projects/
// tasks/teams, verified in lib/services/user.service.ts's own code path) —
// Global Search legitimately has nothing org-scoped to search, which is the
// safe default, never a cross-organization leak. Notifications are queried
// by uid regardless of organizationId, so they still work correctly.
export default function SuperAdminLayout({ children }: { children: ReactNode }) {
  return (
    <SuperAdminRoute>
      <PlatformProvider>
        <WorkspaceProvider>
          <PlatformShell navKey="superadmin" brandLabel="NxtWise Platform Administration" roleBadge="Platform Owner">
            {children}
          </PlatformShell>
        </WorkspaceProvider>
      </PlatformProvider>
    </SuperAdminRoute>
  );
}
