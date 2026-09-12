"use client";

import { Building2, ShieldCheck, User as UserIcon, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PlatformRole } from "@/types/platform";

interface RoleOption {
  role: PlatformRole;
  caps: string;
  tagline: string;
  description: string;
  icon: LucideIcon;
}

const ROLE_OPTIONS: RoleOption[] = [
  {
    role: "super_admin",
    caps: "SUPER ADMIN",
    tagline: "Platform Owner",
    description: "Control the entire TASKORA platform",
    icon: ShieldCheck,
  },
  {
    role: "admin",
    caps: "ADMIN",
    tagline: "Organization Administrator",
    description: "Manage your organization, teams, users and projects",
    icon: Building2,
  },
  {
    role: "user",
    caps: "USER",
    tagline: "Team Member",
    description: "Access your assigned projects, tasks and workspace",
    icon: UserIcon,
  },
];

interface RoleSelectCardsProps {
  onSelect: (role: PlatformRole) => void;
}

export function RoleSelectCards({ onSelect }: RoleSelectCardsProps) {
  return (
    <div role="radiogroup" aria-label="Sign-in role" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {ROLE_OPTIONS.map(({ role, caps, tagline, description, icon: Icon }) => (
        <button
          key={role}
          type="button"
          role="radio"
          aria-checked="false"
          onClick={() => onSelect(role)}
          className={cn(
            "group flex flex-col items-start gap-3 rounded-xl border border-border bg-card p-5 text-left",
            "transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[0_12px_32px_-16px_rgba(0,0,0,0.35)]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:border-primary/50"
          )}
        >
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
            <Icon className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-wide text-primary">{caps}</p>
            <p className="mt-0.5 text-sm font-semibold text-foreground">{tagline}</p>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{description}</p>
          </div>
        </button>
      ))}
    </div>
  );
}
