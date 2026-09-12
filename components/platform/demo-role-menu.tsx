"use client";

import { useRouter } from "next/navigation";
import { FlaskConical, ShieldCheck, Building2, User as UserIcon, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { isDemoModeEnabled, useDemoRole } from "@/components/platform/demo-role-provider";
import { ROLE_HOME_PATH } from "@/lib/platform/constants";
import type { PlatformRole } from "@/types/platform";

const DEMO_OPTIONS: { role: PlatformRole; label: string; icon: typeof ShieldCheck }[] = [
  { role: "super_admin", label: "Super Admin Demo", icon: ShieldCheck },
  { role: "admin", label: "Admin Demo", icon: Building2 },
  { role: "user", label: "User Demo", icon: UserIcon },
];

/**
 * Dev-only role preview + jump menu. Lets an already-authenticated session
 * preview any of the three platform experiences with one click — sets the
 * demo role override and navigates to that role's home route. Rendered from
 * every shell (real user Topbar and the Admin/Super Admin PlatformShell) so
 * it's reachable no matter which experience a real account currently lands
 * on. Never rendered in production (`isDemoModeEnabled` is false whenever
 * NODE_ENV is "production"), and never a substitute for real authorization —
 * see components/platform/demo-role-provider.tsx.
 */
export function DemoRoleMenu() {
  const { demoRole, setDemoRole } = useDemoRole();
  const router = useRouter();
  if (!isDemoModeEnabled) return null;

  function activate(role: PlatformRole) {
    setDemoRole(role);
    router.push(ROLE_HOME_PATH[role]);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 border-amber-500/30 bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 dark:text-amber-400"
          />
        }
      >
        <FlaskConical className="size-3.5" />
        <span className="hidden sm:inline">Demo</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Preview a platform role</DropdownMenuLabel>
          {DEMO_OPTIONS.map(({ role, label, icon: Icon }) => (
            <DropdownMenuItem key={role} onClick={() => activate(role)}>
              <Icon />
              {label}
              {demoRole === role && <Check className="ml-auto size-3.5" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        {demoRole && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setDemoRole(null)}>Exit demo (use real role)</DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
