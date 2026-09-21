import type { ReactNode } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { AccessGate } from "@/components/shared/access-gate";
import { OrganizationRegistrationGate } from "@/components/auth/organization-registration-gate";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="taskora-ambient-surface flex-1 overflow-y-auto">
          <div className="relative z-10 mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <AccessGate>
              <OrganizationRegistrationGate>{children}</OrganizationRegistrationGate>
            </AccessGate>
          </div>
        </main>
      </div>
    </div>
  );
}
