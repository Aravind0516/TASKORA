"use client";

import { useEffect } from "react";
import { installNotificationSoundUnlock } from "@/lib/notifications/sound";

/**
 * Mounted once in the root layout so ANY interaction with TASKORA — including
 * signing in on /login — unlocks notification audio for the rest of the page's
 * life. Renders nothing. See lib/notifications/sound.ts.
 */
export function NotificationSoundUnlock() {
  useEffect(() => installNotificationSoundUnlock(), []);
  return null;
}
