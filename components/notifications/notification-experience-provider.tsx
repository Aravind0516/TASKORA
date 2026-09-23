"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import {
  ToastProvider,
  ToastPortal,
  ToastViewport,
  ToastRoot,
  ToastContent,
  ToastTitle,
  ToastDescription,
  ToastClose,
  useToastManager,
} from "@/components/ui/toast";
import { useWorkspace } from "@/components/workspace/workspace-provider";
import { playNotificationSound, unlockNotificationAudio } from "@/lib/notifications/sound";
import { SOUND_PREFERENCE_KEY } from "@/lib/notifications/categories";
import type { AppNotification } from "@/types/notification";

/**
 * TASKORA's ONE centralized notification popup + sound experience — mounted
 * once per shell (see app/(app)/layout.tsx, app/admin/layout.tsx,
 * app/superadmin/layout.tsx: it wraps WorkspaceProvider's children, right
 * alongside the shell itself), so it stays mounted across every page
 * navigation within that shell rather than resetting per-page. No page or
 * component ever calls playNotificationSound()/creates a toast directly —
 * this is the only place that does, watching the SAME live `notifications`
 * array (useWorkspace()'s existing subscribeToNotifications listener,
 * already used by NotificationsMenu) rather than a second subscription.
 */
export function NotificationExperienceProvider({ children }: { children: ReactNode }) {
  return (
    <ToastProvider limit={4} timeout={7000}>
      {children}
      <NotificationBridge />
      <ToastPortal>
        <ToastViewport>
          <NotificationToastList />
        </ToastViewport>
      </ToastPortal>
    </ToastProvider>
  );
}

/**
 * Watches the live notifications array for genuinely NEW arrivals (never
 * the historical batch a fresh listener/remount/reconnect delivers) and
 * turns each one into a toast + sound — see the seen-ID tracking below for
 * why this doesn't duplicate on refetch/reconnect/navigation.
 */
function NotificationBridge() {
  const { uid, notifications, getMemberById } = useWorkspace();
  const toastManager = useToastManager();
  const seenIds = useRef<Set<string> | null>(null);

  // Unlock the shared AudioContext on the first real user gesture within
  // this shell — browsers block audio.play()/AudioContext until then, and a
  // Firestore listener firing is never itself a user gesture.
  useEffect(() => {
    function handleFirstInteraction() {
      unlockNotificationAudio();
    }
    window.addEventListener("pointerdown", handleFirstInteraction, { once: true });
    window.addEventListener("keydown", handleFirstInteraction, { once: true });
    return () => {
      window.removeEventListener("pointerdown", handleFirstInteraction);
      window.removeEventListener("keydown", handleFirstInteraction);
    };
  }, []);

  useEffect(() => {
    if (!uid) return;

    // First snapshot this session (or after a genuine remount) — the
    // listener's initial batch is historical, not "new," so every id in it
    // is marked seen WITHOUT popping a toast/sound for any of them.
    if (seenIds.current === null) {
      seenIds.current = new Set(notifications.map((n) => n.id));
      return;
    }

    const soundEnabled = getMemberById(uid)?.notificationPreferences?.[SOUND_PREFERENCE_KEY] !== false;
    let playedSoundThisBatch = false;

    for (const notification of notifications) {
      if (seenIds.current.has(notification.id)) continue;
      seenIds.current.add(notification.id);

      toastManager.add<AppNotification>({
        id: notification.id,
        title: notification.title,
        description: notification.message,
        data: notification,
        timeout: 7000,
      });

      // Several notifications can legitimately land in the same batch (a
      // task assigned to multiple people fans out as multiple documents,
      // for instance) — every one still gets its own toast/entry in the
      // Notification Center, but the chime only plays once per batch so a
      // burst of arrivals doesn't sound like a stutter.
      if (soundEnabled && !playedSoundThisBatch) {
        playNotificationSound();
        playedSoundThisBatch = true;
      }
    }
  }, [notifications, uid, getMemberById, toastManager]);

  return null;
}

function NotificationToastList() {
  const { toasts } = useToastManager();
  const router = useRouter();
  const { markNotificationRead } = useWorkspace();

  return toasts.map((toast) => {
    const notification = toast.data as AppNotification | undefined;
    return (
      <ToastRoot key={toast.id} toast={toast}>
        <button
          type="button"
          className="flex w-full items-start gap-2.5 text-left"
          onClick={() => {
            if (notification) {
              markNotificationRead(notification.id).catch(() => {});
              router.push(notification.href);
            }
          }}
        >
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Bell className="size-3.5" />
          </span>
          <ToastContent>
            <ToastTitle>{toast.title}</ToastTitle>
            <ToastDescription>{toast.description}</ToastDescription>
          </ToastContent>
        </button>
        <ToastClose onClick={(e) => e.stopPropagation()} />
      </ToastRoot>
    );
  });
}
