import type { ReactNode } from "react";
import { AdminRoute } from "@/components/auth/admin-route";
import { PlatformProvider } from "@/components/platform/platform-provider";
import { PlatformShell } from "@/components/platform/platform-shell";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AdminRoute>
      <PlatformProvider>
        <PlatformShell navKey="admin" brandLabel="Admin" roleBadge="Organization Administrator">
          {children}
        </PlatformShell>
      </PlatformProvider>
    </AdminRoute>
  );
}
