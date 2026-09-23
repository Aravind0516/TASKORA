import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { WorkspaceProvider } from "@/components/workspace/workspace-provider";
import { NotificationExperienceProvider } from "@/components/notifications/notification-experience-provider";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute>
      <WorkspaceProvider>
        <NotificationExperienceProvider>
          <AppShell>{children}</AppShell>
        </NotificationExperienceProvider>
      </WorkspaceProvider>
    </ProtectedRoute>
  );
}
