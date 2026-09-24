// Notification chime, synthesized with the Web Audio API (no audio asset to
// ship or load). Browsers block audio until the user has interacted with the
// page, so the AudioContext is only ever created from a real user gesture
// (unlockNotificationSound, wired to the first pointer/key event by
// components/layout/notification-alerts.tsx). Until then — or if audio is
// unavailable/blocked for any reason — playNotificationChime() is a silent
// no-op: the popup and unread badge never depend on sound succeeding.

type AudioContextConstructor = typeof AudioContext;

let context: AudioContext | null = null;

function audioContextConstructor(): AudioContextConstructor | null {
  if (typeof window === "undefined") return null;
  const legacy = (window as Window & { webkitAudioContext?: AudioContextConstructor }).webkitAudioContext;
  return window.AudioContext ?? legacy ?? null;
}

/** Call from a user-gesture handler only. Safe to call repeatedly. */
export function unlockNotificationSound(): void {
  try {
    if (!context) {
      const Ctor = audioContextConstructor();
      if (!Ctor) return;
      context = new Ctor();
    }
    if (context.state === "suspended") void context.resume().catch(() => undefined);
  } catch {
    context = null;
  }
}

/** Plays a short two-note chime if audio has been unlocked and is running; otherwise does nothing. Never throws. */
export function playNotificationChime(): void {
  try {
    if (!context || context.state !== "running") return;
    const start = context.currentTime;
    const gain = context.createGain();
    gain.connect(context.destination);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.08, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.4);

    [880, 1320].forEach((frequency, index) => {
      const oscillator = context!.createOscillator();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, start + index * 0.12);
      oscillator.connect(gain);
      oscillator.start(start + index * 0.12);
      oscillator.stop(start + 0.4);
    });
  } catch {
    // Audio is a nicety — a failure here must never surface to the user.
  }
}
