"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import { navItems } from "@/components/layout/nav-config";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SidebarNavProps {
  collapsed?: boolean;
  onNavigate?: () => void;
}

export function SidebarNav({ collapsed = false, onNavigate }: SidebarNavProps) {
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
          <LayoutGrid className="size-4.5" />
        </div>
        {!collapsed && (
          <div className="min-w-0 leading-tight">
            <p className="truncate text-[15px] font-bold tracking-[0.06em] text-white">TASKORA</p>
            <p className="truncate text-[11px] text-sidebar-muted-foreground">Workflow Platform</p>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-1 px-3 py-2">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          const linkClassName = cn(
            "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-[background-color,color,transform] duration-150",
            collapsed && "justify-center px-0",
            isActive
              ? "taskora-sidebar-active text-white"
              : "text-sidebar-foreground/65 hover:translate-x-0.5 hover:bg-sidebar-accent hover:text-sidebar-foreground"
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
              <TooltipTrigger
                render={<Link href={item.href} onClick={onNavigate} className={linkClassName} />}
              >
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
