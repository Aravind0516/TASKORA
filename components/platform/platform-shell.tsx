"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ChevronsLeft, ChevronsRight, LogOut, Menu, Settings, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PlatformSidebarNav } from "@/components/platform/platform-sidebar-nav";
import { DemoRoleMenu } from "@/components/platform/demo-role-menu";
import { CreateOrganizationDialog } from "@/components/platform/create-organization-dialog";
import { usePlatformRole } from "@/components/platform/use-platform-role";
import { useDemoRole } from "@/components/platform/demo-role-provider";
import { usePlatform } from "@/components/platform/platform-provider";
import { useAuth } from "@/components/auth/auth-provider";
import { logout } from "@/lib/services/auth.service";
import { initials } from "@/lib/format";
import { ADMIN_NAV, SUPER_ADMIN_NAV } from "@/components/platform/nav-config";
import { ROLE_DISPLAY_LABELS, ROLE_CAPS_LABEL } from "@/lib/platform/constants";

// nav config (with its Lucide icon component references) is resolved here,
// inside the client boundary — a Server Component layout can't pass function
// values like icon components down as props across the RSC boundary.
interface PlatformShellProps {
  navKey: "admin" | "superadmin";
  brandLabel: string;
  roleBadge: string;
  children: ReactNode;
}

export function PlatformShell({ navKey, brandLabel, roleBadge, children }: PlatformShellProps) {
  const navItems = navKey === "admin" ? ADMIN_NAV : SUPER_ADMIN_NAV;
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { user } = useAuth();
  const { role } = usePlatformRole();
  const { dataError, isPreviewMismatch, hasNoOrganization } = usePlatform();
  const { setDemoRole } = useDemoRole();
  const router = useRouter();
  const [createOrgOpen, setCreateOrgOpen] = useState(false);

  const displayName = user?.displayName || user?.email || "Account";
  const email = user?.email ?? "";
  const roleLabel = role ? ROLE_DISPLAY_LABELS[role] : roleBadge;
  const roleCaps = role ? ROLE_CAPS_LABEL[role] : null;

  async function handleLogout() {
    // Clear the dev-only demo role override too — otherwise it silently
    // carries into the next real login and masks that account's real
    // access, exactly like the permission-denied issue this was built to
    // prevent a repeat of.
    setDemoRole(null);
    await logout();
    router.replace("/");
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <aside
        className={cn(
          "hidden shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 md:flex md:flex-col",
          collapsed ? "w-[68px]" : "w-64"
        )}
      >
        <div className="flex-1 overflow-y-auto">
          <PlatformSidebarNav navItems={navItems} brandLabel={brandLabel} collapsed={collapsed} />
        </div>
        <div className="border-t border-sidebar-border p-2">
          <Button
            variant="ghost"
            size="icon"
            className="w-full text-muted-foreground hover:text-foreground"
            onClick={() => setCollapsed((prev) => !prev)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronsRight className="size-4" /> : <ChevronsLeft className="size-4" />}
          </Button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-border bg-background px-4 sm:px-6">
          <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              aria-label="Open navigation"
              onClick={() => setMobileNavOpen(true)}
            >
              <Menu className="size-5" />
            </Button>
            <SheetContent side="left" className="w-64 p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <PlatformSidebarNav navItems={navItems} brandLabel={brandLabel} onNavigate={() => setMobileNavOpen(false)} />
            </SheetContent>
          </Sheet>

          <Badge variant="secondary" className="hidden sm:inline-flex">
            {roleBadge}
          </Badge>

          <div className="ml-auto flex items-center gap-2">
            <DemoRoleMenu />

            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="ghost" className="gap-2 px-1.5" />}>
                <Avatar size="sm">
                  <AvatarFallback>{initials(displayName)}</AvatarFallback>
                </Avatar>
                <span className="hidden text-sm font-medium sm:inline">{displayName.split(" ")[0]}</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-1.5 py-1 text-xs text-muted-foreground">
                  <p className="text-sm font-medium text-foreground">{displayName}</p>
                  {roleCaps && <p className="mt-0.5 text-[11px] font-semibold tracking-wide text-primary">{roleCaps}</p>}
                  <p className="text-xs text-muted-foreground">{roleLabel}</p>
                  <p className="text-xs text-muted-foreground">{email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push("/overview")}>
                  <User />
                  User dashboard
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/settings")}>
                  <Settings />
                  Account settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={handleLogout}>
                  <LogOut />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
            {isPreviewMismatch && (
              <div className="mb-5 flex flex-col items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3.5 text-sm text-amber-800 sm:flex-row sm:items-center sm:justify-between dark:text-amber-300">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  <p>
                    You&apos;re previewing this experience with the demo role switcher, but your signed-in account isn&apos;t
                    actually assigned to an organization yet — the data below is empty because it&apos;s real, not because
                    anything is broken.
                    {navKey === "admin"
                      ? " Create a real organization below to unlock real Admin access on this account, or turn off the demo role to go back to your real access."
                      : " Turn off the demo role to see your account's real access."}
                  </p>
                </div>
                {navKey === "admin" && (
                  <Button size="sm" variant="outline" className="shrink-0 border-amber-500/40" onClick={() => setCreateOrgOpen(true)}>
                    Create Organization
                  </Button>
                )}
              </div>
            )}
            {!isPreviewMismatch && hasNoOrganization && (
              <div className="mb-5 flex flex-col items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3.5 text-sm text-amber-800 sm:flex-row sm:items-center sm:justify-between dark:text-amber-300">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  <p>
                    {navKey === "admin"
                      ? "Your admin account is not assigned to an organization yet."
                      : "Your account is not assigned to an organization yet."}
                  </p>
                </div>
                {navKey === "admin" && (
                  <Button size="sm" variant="outline" className="shrink-0 border-amber-500/40" onClick={() => setCreateOrgOpen(true)}>
                    Create Organization
                  </Button>
                )}
              </div>
            )}
            {!isPreviewMismatch && !hasNoOrganization && dataError && (
              <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <p>{dataError}</p>
              </div>
            )}
            {children}
          </div>
        </main>
      </div>

      {navKey === "admin" && <CreateOrganizationDialog open={createOrgOpen} onOpenChange={setCreateOrgOpen} />}
    </div>
  );
}
