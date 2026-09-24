import type { AppNotification } from "@/types/notification";

// Decides which notifications in a realtime snapshot are GENUINELY new events
// (worth a popup/sound), as opposed to history the listener is merely
// (re)loading. Pure, so it can be reasoned about and tested independently of
// React/Firestore.
//
//   - The first snapshot only hydrates: everything in it is marked seen and
//     nothing alerts, however many unread notifications it contains. That is
//     what makes a reload, a remount, or navigating between shells silent.
//   - Later snapshots alert only for ids never seen before, that are unread,
//     and that are newer than the newest notification present at hydration
//     (the watermark). The watermark keeps an old notification that merely
//     re-enters the listener's 50-item window (after others are deleted), or
//     reappears after a re-subscription, from being mistaken for a new one.

export interface DetectionState {
  seenIds: ReadonlySet<string>;
  /** Newest createdAt present when hydrated — null if the user had no notifications yet. */
  watermark: string | null;
}

function newestCreatedAt(notifications: AppNotification[]): string | null {
  let newest: string | null = null;
  for (const n of notifications) {
    if (newest === null || n.createdAt > newest) newest = n.createdAt;
  }
  return newest;
}

export function hydrateDetection(notifications: AppNotification[]): DetectionState {
  return { seenIds: new Set(notifications.map((n) => n.id)), watermark: newestCreatedAt(notifications) };
}

export function detectNewNotifications(
  state: DetectionState,
  notifications: AppNotification[]
): { state: DetectionState; fresh: AppNotification[] } {
  const unseen = notifications.filter((n) => !state.seenIds.has(n.id));
  if (unseen.length === 0) return { state, fresh: [] };

  const seenIds = new Set(state.seenIds);
  unseen.forEach((n) => seenIds.add(n.id));
  const fresh = unseen.filter((n) => !n.read && (state.watermark === null || n.createdAt > state.watermark));
  return { state: { seenIds, watermark: state.watermark }, fresh };
}
