"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu, LogOut, Settings, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { GlobalSearch } from "@/components/layout/global-search";
import { NotificationsMenu } from "@/components/layout/notifications-menu";
import { DemoRoleMenu } from "@/components/platform/demo-role-menu";
import { usePlatformRole } from "@/components/platform/use-platform-role";
import { useDemoRole } from "@/components/platform/demo-role-provider";
import { useAuth } from "@/components/auth/auth-provider";
import { logout } from "@/lib/services/auth.service";
import { markIntentionalLogout } from "@/lib/logout-state";
import { initials } from "@/lib/format";
import { ROLE_DISPLAY_LABELS, ROLE_CAPS_LABEL } from "@/lib/platform/constants";

export function Topbar() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const router = useRouter();
  const { user } = useAuth();
  const { role } = usePlatformRole();
  const { setDemoRole } = useDemoRole();

  const displayName = user?.displayName || user?.email || "Account";
  const email = user?.email ?? "";
  const roleLabel = role ? ROLE_DISPLAY_LABELS[role] : "Team Member";
  const roleCaps = role ? ROLE_CAPS_LABEL[role] : "USER";

  async function handleLogout() {
    setDemoRole(null);
    // See components/platform/platform-shell.tsx's handleLogout for why
    // this is needed — ProtectedRoute has its own "no user -> /login"
    // redirect that would otherwise race this one.
    markIntentionalLogout();
    await logout();
    router.replace("/");
  }

  return (
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
          <SidebarNav onNavigate={() => setMobileNavOpen(false)} />
        </SheetContent>
      </Sheet>

      <GlobalSearch />

      <div className="ml-auto flex items-center gap-1.5">
        <DemoRoleMenu />
        <NotificationsMenu />

        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" className="ml-1 gap-2 px-1.5" />}>
            <Avatar size="sm">
              <AvatarFallback>{initials(displayName)}</AvatarFallback>
            </Avatar>
            <span className="hidden text-sm font-medium sm:inline">
              {displayName.split(" ")[0]}
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-1.5 py-1 text-xs text-muted-foreground">
              <p className="text-sm font-medium text-foreground">{displayName}</p>
              <p className="mt-0.5 text-[11px] font-semibold tracking-wide text-primary">{roleCaps}</p>
              <p className="text-xs text-muted-foreground">{roleLabel}</p>
              <p className="text-xs text-muted-foreground">{email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem render={<Link href="/settings" />}>
              <User />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem render={<Link href="/settings" />}>
              <Settings />
              Settings
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
  );
}
