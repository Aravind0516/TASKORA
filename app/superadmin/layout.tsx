import type { ReactNode } from "react";
import { SuperAdminRoute } from "@/components/auth/super-admin-route";
import { PlatformProvider } from "@/components/platform/platform-provider";
import { PlatformShell } from "@/components/platform/platform-shell";

export default function SuperAdminLayout({ children }: { children: ReactNode }) {
  return (
    <SuperAdminRoute>
      <PlatformProvider>
        <PlatformShell navKey="superadmin" brandLabel="Super Admin" roleBadge="Platform Owner">
          {children}
        </PlatformShell>
      </PlatformProvider>
    </SuperAdminRoute>
  );
}
