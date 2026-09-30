"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/components/workspace/workspace-provider";
import { detectNewNotifications, hydrateDetection, type DetectionState } from "@/lib/notifications/new-notification-detection";
import { notificationAlertBehavior } from "@/lib/notifications/categories";
import { playNotificationChime } from "@/lib/notifications/sound";
import type { AppNotification } from "@/types/notification";
import { useShellHref } from "@/components/layout/use-shell-href";

const POPUP_LIFETIME_MS = 12000;
const MAX_VISIBLE_POPUPS = 3;
const CHIME_CLAIMS_KEY = "taskora:chimed-notifications";
const CHIME_CLAIM_TTL_MS = 10 * 60 * 1000;

/**
 * With TASKORA open in several tabs, every tab's listener receives the same
 * new notification — only the first tab to claim its id plays the chime.
 * Best-effort (storage can be unavailable, e.g. private mode), in which case
 * this tab simply chimes.
 */
function claimChime(notificationId: string): boolean {
  try {
    const now = Date.now();
    const raw = window.localStorage.getItem(CHIME_CLAIMS_KEY);
    const claims = (raw ? (JSON.parse(raw) as [string, number][]) : []).filter(([, at]) => now - at < CHIME_CLAIM_TTL_MS);
    if (claims.some(([id]) => id === notificationId)) return false;
    claims.push([notificationId, now]);
    window.localStorage.setItem(CHIME_CLAIMS_KEY, JSON.stringify(claims.slice(-100)));
    return true;
  } catch {
    return true;
  }
}

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
      const alerting = fresh.filter((n) => notificationAlertBehavior(n.type).popup);
      if (alerting.length > 0) setPopups((current) => [...alerting, ...current].slice(0, MAX_VISIBLE_POPUPS));
    }
  }

  // At most one chime per batch of genuinely new popups — never per
  // re-render, never for a type whose policy is popup-only, and never twice
  // for the same notification (this component, or another open tab). Audio
  // unlocking is app-wide (components/layout/notification-sound-unlock.tsx).
  const handledIdsRef = useRef(new Set<string>());
  useEffect(() => {
    const unhandled = popups.filter((p) => !handledIdsRef.current.has(p.id));
    if (unhandled.length === 0) return;
    unhandled.forEach((p) => handledIdsRef.current.add(p.id));
    const chimeFor = unhandled.filter((p) => notificationAlertBehavior(p.type).sound && claimChime(p.id));
    if (chimeFor.length > 0) playNotificationChime();
  }, [popups]);

  const dismiss = useCallback((id: string) => {
    setPopups((current) => current.filter((p) => p.id !== id));
  }, []);

  if (popups.length === 0) return null;

  // Top of the screen, just under the header, above every page element —
  // where the eye already is, instead of a small card in the bottom corner.
  // Full width on phones, a fixed-width stack at the top-right otherwise.
  // Portalled to <body>: this component is mounted inside the header, whose
  // backdrop-blur would otherwise make it the popup's containing block and
  // trap it under the header's stacking context.
  return createPortal(
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-3 top-[4.5rem] z-[100] flex flex-col gap-3 sm:inset-x-auto sm:right-5 sm:w-[24rem]"
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
    </div>,
    document.body
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
  const shellHref = useShellHref();
  // Stays up while the pointer or keyboard focus is on it, so it can be read
  // at leisure; the countdown resumes from where it paused.
  const [paused, setPaused] = useState(false);
  const remainingRef = useRef(POPUP_LIFETIME_MS);
  useEffect(() => {
    if (paused) return;
    const startedAt = Date.now();
    const timeout = setTimeout(() => onDismiss(notification.id), remainingRef.current);
    return () => {
      clearTimeout(timeout);
      remainingRef.current = Math.max(1000, remainingRef.current - (Date.now() - startedAt));
    };
  }, [paused, notification.id, onDismiss]);

  const href = shellHref(notification.href);

  return (
    <div
      role="status"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className="pointer-events-auto relative overflow-hidden rounded-xl border-2 border-primary/50 bg-card text-card-foreground shadow-2xl ring-4 ring-primary/10 animate-in fade-in slide-in-from-top-4 duration-300"
    >
      <span aria-hidden className="absolute inset-y-0 left-0 w-1.5 bg-primary" />
      <div className="flex gap-3 py-3.5 pr-2.5 pl-5">
        <span aria-hidden className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
          <Bell className="size-4.5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold tracking-wide text-primary uppercase">New notification</p>
          <Link href={href} onClick={() => onOpen(notification.id)} className="block rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <p className="mt-0.5 text-[15px] leading-snug font-semibold text-foreground">{notification.title}</p>
            {notification.message && <p className="mt-1 line-clamp-3 text-sm leading-snug text-foreground/80">{notification.message}</p>}
          </Link>
          <div className="mt-2.5">
            <Button size="sm" nativeButton={false} render={<Link href={href} onClick={() => onOpen(notification.id)} />}>
              View
            </Button>
          </div>
        </div>
        <Button variant="ghost" size="icon-sm" className="shrink-0" aria-label="Dismiss notification" onClick={() => onDismiss(notification.id)}>
          <X />
        </Button>
      </div>
      <span
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-1 origin-left bg-primary/60 motion-reduce:hidden"
        style={{ animation: `notification-countdown ${POPUP_LIFETIME_MS}ms linear forwards`, animationPlayState: paused ? "paused" : "running" }}
      />
    </div>
  );
}
