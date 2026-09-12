"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/components/layout/nav-config";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface PlatformSidebarNavProps {
  navItems: NavItem[];
  brandLabel: string;
  collapsed?: boolean;
  onNavigate?: () => void;
}

export function PlatformSidebarNav({ navItems, brandLabel, collapsed = false, onNavigate }: PlatformSidebarNavProps) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col">
      <div
        className={cn(
          "flex h-16 items-center gap-2.5 px-4",
          collapsed && "justify-center px-0"
        )}
      >
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <ShieldCheck className="size-4.5" />
        </div>
        {!collapsed && (
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-semibold tracking-tight">TASKORA</p>
            <p className="truncate text-[11px] text-muted-foreground">{brandLabel}</p>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-1 px-3 py-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          const linkClassName = cn(
            "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
            collapsed && "justify-center px-0",
            isActive
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
          );

          if (!collapsed) {
            return (
              <Link key={item.href} href={item.href} onClick={onNavigate} className={linkClassName}>
                <Icon className="size-4.5 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          }

          return (
            <Tooltip key={item.href}>
              <TooltipTrigger render={<Link href={item.href} onClick={onNavigate} className={linkClassName} />}>
                <Icon className="size-4.5 shrink-0" />
              </TooltipTrigger>
              <TooltipContent side="right">{item.label}</TooltipContent>
            </Tooltip>
          );
        })}
      </nav>
    </div>
  );
}
