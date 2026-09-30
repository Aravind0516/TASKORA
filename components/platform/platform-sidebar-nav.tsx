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
        <div className="taskora-brand-gradient flex size-9 shrink-0 items-center justify-center rounded-xl text-white shadow-[0_8px_20px_-6px_oklch(0.55_0.22_280/0.7),inset_0_1px_0_oklch(1_0_0/0.25)]">
          <ShieldCheck className="size-4.5" />
        </div>
        {!collapsed && (
          <div className="min-w-0 leading-tight">
            <p className="truncate text-[15px] font-bold tracking-[0.06em] text-white">TASKORA</p>
            <p className="truncate text-[11px] text-sidebar-muted-foreground">{brandLabel}</p>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-1 px-3 py-2">
        {navItems.map((item, index) => {
          // A shell's root item ("/admin", "/superadmin") is active only on
          // the dashboard itself — as a prefix it matched every console page,
          // highlighting it alongside the real section.
          const isShellRoot = item.href.split("/").filter(Boolean).length === 1;
          const isActive = pathname === item.href || (!isShellRoot && pathname.startsWith(`${item.href}/`));
          const Icon = item.icon;
          const linkClassName = cn(
            "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-[background-color,color,transform] duration-150",
            collapsed && "justify-center px-0",
            isActive
              ? "taskora-sidebar-active text-white"
              : "text-sidebar-foreground/65 hover:translate-x-0.5 hover:bg-sidebar-accent hover:text-sidebar-foreground"
          );
          // A group label renders once, right before the first item of a new
          // group — collapsed mode skips the text (no room) but keeps a
          // small top margin so groups still read as visually separated.
          const isNewGroup = item.group !== undefined && item.group !== navItems[index - 1]?.group;

          const link = !collapsed ? (
            <Link key={item.href} href={item.href} onClick={onNavigate} className={linkClassName}>
              <Icon className="size-4.5 shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          ) : (
            <Tooltip key={item.href}>
              <TooltipTrigger render={<Link href={item.href} onClick={onNavigate} className={linkClassName} />}>
                <Icon className="size-4.5 shrink-0" />
              </TooltipTrigger>
              <TooltipContent side="right">{item.label}</TooltipContent>
            </Tooltip>
          );

          if (!isNewGroup) return link;
          return (
            <div key={item.href} className={index > 0 ? "mt-4" : undefined}>
              {!collapsed && (
                <p className="mb-1.5 px-3 text-[11px] font-semibold tracking-wide text-sidebar-foreground/40 uppercase">
                  {item.group}
                </p>
              )}
              {link}
            </div>
          );
        })}
      </nav>
    </div>
  );
}
