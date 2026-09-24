"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/components/workspace/workspace-provider";
import { detectNewNotifications, hydrateDetection, type DetectionState } from "@/lib/notifications/new-notification-detection";
import { playNotificationChime, unlockNotificationSound } from "@/lib/notifications/sound";
import type { AppNotification } from "@/types/notification";

const POPUP_LIFETIME_MS = 6000;
const MAX_VISIBLE_POPUPS = 3;

/**
 * Popup + chime for notifications that arrive WHILE the app is open. Reads
 * the same realtime notifications list as the bell (NotificationsMenu) and
 * never writes anything except "mark read" when a popup is clicked — so it
 * can't create, duplicate, or re-flag a notification. See
 * lib/notifications/new-notification-detection.ts for how "new" is decided
 * (first snapshot hydrates silently; reloads/reconnects never replay).
 */
export function NotificationAlerts() {
  const { notifications, loaded, markNotificationRead } = useWorkspace();
  const [trackedSource, setTrackedSource] = useState<AppNotification[] | null>(null);
  const [detection, setDetection] = useState<DetectionState | null>(null);
  const [popups, setPopups] = useState<AppNotification[]>([]);

  // Render-body "adjust state when a value changes" (see CLAUDE.md) —
  // processes each new snapshot array exactly once.
  if (loaded.notifications && notifications !== trackedSource) {
    setTrackedSource(notifications);
    if (detection === null) {
      setDetection(hydrateDetection(notifications));
    } else {
      const { state, fresh } = detectNewNotifications(detection, notifications);
      if (state !== detection) setDetection(state);
      if (fresh.length > 0) setPopups((current) => [...fresh, ...current].slice(0, MAX_VISIBLE_POPUPS));
    }
  }

  // Audio may only start after a user gesture — unlock on the first one.
  useEffect(() => {
    function unlock() {
      unlockNotificationSound();
    }
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  // One chime per batch of genuinely new popups, never per re-render.
  const chimedIdsRef = useRef(new Set<string>());
  useEffect(() => {
    const unchimed = popups.filter((p) => !chimedIdsRef.current.has(p.id));
    if (unchimed.length === 0) return;
    unchimed.forEach((p) => chimedIdsRef.current.add(p.id));
    playNotificationChime();
  }, [popups]);

  const dismiss = useCallback((id: string) => {
    setPopups((current) => current.filter((p) => p.id !== id));
  }, []);

  if (popups.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed right-4 z-50 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2"
      style={{ bottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}
    >
      {popups.map((popup) => (
        <NotificationPopup
          key={popup.id}
          notification={popup}
          onDismiss={dismiss}
          onOpen={(id) => {
            dismiss(id);
            markNotificationRead(id).catch(() => undefined);
          }}
        />
      ))}
    </div>
  );
}

function NotificationPopup({
  notification,
  onDismiss,
  onOpen,
}: {
  notification: AppNotification;
  onDismiss: (id: string) => void;
  onOpen: (id: string) => void;
}) {
  useEffect(() => {
    const timeout = setTimeout(() => onDismiss(notification.id), POPUP_LIFETIME_MS);
    return () => clearTimeout(timeout);
  }, [notification.id, onDismiss]);

  return (
    <div role="status" className="pointer-events-auto flex gap-3 rounded-lg border border-border bg-popover p-3 text-popover-foreground shadow-lg">
      <Bell className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
      <Link href={notification.href} onClick={() => onOpen(notification.id)} className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{notification.title}</p>
        <p className="line-clamp-2 text-xs text-muted-foreground">{notification.message}</p>
      </Link>
      <Button variant="ghost" size="icon-sm" className="shrink-0" aria-label="Dismiss notification" onClick={() => onDismiss(notification.id)}>
        <X />
      </Button>
    </div>
  );
}
