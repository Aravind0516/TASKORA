import type { ReactNode } from "react";
import { AdminRoute } from "@/components/auth/admin-route";
import { PlatformProvider } from "@/components/platform/platform-provider";
import { WorkspaceProvider } from "@/components/workspace/workspace-provider";
import { PlatformShell } from "@/components/platform/platform-shell";

// WorkspaceProvider is added here (alongside PlatformProvider, not instead
// of it) purely so PlatformShell can mount the EXISTING NotificationsMenu/
// GlobalSearch components unchanged — both are hard-wired to useWorkspace()
// and were previously only ever rendered inside the regular (app) shell.
// This does not change what an ORG_ADMIN can see: WorkspaceProvider already
// gives a privileged role (admin/super_admin) the same unrestricted,
// org-wide project/task subscription PlatformProvider does (see
// lib/services/project.service.ts's subscribeToProjects), so nothing here
// grants new access — it only makes two already-approved components reachable
// from this shell too, per the final audit's HIGH-1 finding.
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AdminRoute>
      <PlatformProvider>
        <WorkspaceProvider>
          <PlatformShell navKey="admin" brandLabel="Admin" roleBadge="Organization Administrator">
            {children}
          </PlatformShell>
        </WorkspaceProvider>
      </PlatformProvider>
    </AdminRoute>
  );
}
