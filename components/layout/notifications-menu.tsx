"use client";

import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/components/workspace/workspace-provider";

export function NotificationsMenu() {
  const { notifications, markNotificationRead, markAllNotificationsRead } = useWorkspace();
  const unreadCount = notifications.filter((n) => !n.read).length;

  function markRead(id: string) {
    markNotificationRead(id).catch(() => {
      // handled via the workspace context's own error surfaces elsewhere
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon" aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`} className="relative" />}
      >
        <Bell className="size-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-3 py-2.5">
          <p className="text-sm font-medium text-foreground">Notifications</p>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() => markAllNotificationsRead()}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <CheckCheck className="size-3.5" />
              Mark all as read
            </button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto border-t border-border">
          {notifications.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">You&apos;re all caught up.</p>
          ) : (
            notifications.map((notification) => (
              <Link
                key={notification.id}
                href={notification.href}
                onClick={() => markRead(notification.id)}
                className="flex gap-2.5 px-3 py-2.5 hover:bg-muted"
              >
                <span
                  className={cn(
                    "mt-1.5 size-1.5 shrink-0 rounded-full",
                    notification.read ? "bg-transparent" : "bg-primary"
                  )}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className={cn("text-sm", notification.read ? "text-muted-foreground" : "font-medium text-foreground")}>
                    {notification.title}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{notification.message}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground/70">{timeAgo(notification.createdAt)}</p>
                </div>
              </Link>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
