"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ChevronsLeft, ChevronsRight, IdCard, LogOut, Menu, Settings } from "lucide-react";
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
import { GlobalSearch } from "@/components/layout/global-search";
import { NotificationsMenu } from "@/components/layout/notifications-menu";
import { AboutTaskoraMenuItem, SidebarProductFooter } from "@/components/shared/product-branding";
import { AccessGate } from "@/components/shared/access-gate";
import { DemoRoleMenu } from "@/components/platform/demo-role-menu";
import { CreateOrganizationDialog } from "@/components/platform/create-organization-dialog";
import { usePlatformRole } from "@/components/platform/use-platform-role";
import { useDemoRole } from "@/components/platform/demo-role-provider";
import { usePlatform } from "@/components/platform/platform-provider";
import { useAuth } from "@/components/auth/auth-provider";
import { logout } from "@/lib/services/auth.service";
import { markIntentionalLogout } from "@/lib/logout-state";
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
    // Tell AdminRoute/SuperAdminRoute not to redirect to /login for the
    // user-becomes-null transition logout() is about to cause — see
    // lib/logout-state.ts. Reordering router.replace()/await logout()
    // alone can't fix this: the guard's redirect is triggered by Firebase's
    // own onAuthStateChanged callback, which only fires after logout()
    // resolves, so it always runs after any navigation issued beforehand.
    markIntentionalLogout();
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
        <SidebarProductFooter collapsed={collapsed} />
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

          <Badge variant="secondary" className="hidden shrink-0 sm:inline-flex">
            {roleBadge}
          </Badge>

          <GlobalSearch />

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <DemoRoleMenu />
            <NotificationsMenu />

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
                <DropdownMenuItem onClick={() => router.push(navKey === "admin" ? "/admin/account" : "/superadmin/account")}>
                  <IdCard />
                  {navKey === "admin" ? "Admin Account" : "Account"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push(navKey === "admin" ? "/admin/settings" : "/superadmin/settings")}>
                  <Settings />
                  {navKey === "admin" ? "Organization Settings" : "Settings"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <AboutTaskoraMenuItem />
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
                      ? " Register a real organization below (subject to Super Admin approval) to unlock real Admin access on this account, or turn off the demo role to go back to your real access."
                      : " Turn off the demo role to see your account's real access."}
                  </p>
                </div>
                {navKey === "admin" && (
                  <Button size="sm" variant="outline" className="shrink-0 border-amber-500/40" onClick={() => setCreateOrgOpen(true)}>
                    Register Organization
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
                    Register Organization
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
            {navKey === "admin" ? <AccessGate>{children}</AccessGate> : children}
          </div>
        </main>
      </div>

      {navKey === "admin" && <CreateOrganizationDialog open={createOrgOpen} onOpenChange={setCreateOrgOpen} />}
    </div>
  );
}
