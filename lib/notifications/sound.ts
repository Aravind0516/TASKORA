// Notification chime, synthesized with the Web Audio API (no audio asset to
// ship or load).
//
// Browsers only let a page start audio after the user has interacted with it
// (a click, tap or key press) — no page can guarantee "always autoplay", and
// this module never pretends to. What it does instead:
//
//   - installNotificationSoundUnlock() is mounted ONCE for the whole app, in
//     the root layout (components/layout/notification-sound-unlock.tsx), so
//     the very interaction of logging in — typing credentials, clicking
//     "Log in" — already unlocks audio. (It used to live inside the logged-in
//     shell, so that interaction happened before the listener existed, and
//     after a refresh sound stayed locked until the next click in the app.)
//   - It keeps listening until audio is actually running, rather than giving
//     up after the first event, and covers mouse, touch and keyboard.
//   - The AudioContext is created once and kept for the life of the page, so
//     client-side navigation never has to unlock again.
//   - Until audio is permitted, playNotificationChime() is a silent no-op —
//     the popup and unread badge never depend on sound.

type AudioContextConstructor = typeof AudioContext;

let context: AudioContext | null = null;
let installed = false;

function audioContextConstructor(): AudioContextConstructor | null {
  if (typeof window === "undefined") return null;
  const legacy = (window as Window & { webkitAudioContext?: AudioContextConstructor }).webkitAudioContext;
  return window.AudioContext ?? legacy ?? null;
}

function isRunning(): boolean {
  return context?.state === "running";
}

/** Creates/resumes the AudioContext. Must be called from a user-gesture handler to succeed; harmless otherwise. */
function unlock(): void {
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

const GESTURE_EVENTS = ["pointerdown", "keydown", "touchstart"] as const;

/**
 * Registers app-wide gesture listeners that unlock audio, removing themselves
 * once audio is running. Idempotent — safe under React Strict Mode double
 * mounting and remounts; returns a cleanup for the mounting component.
 */
export function installNotificationSoundUnlock(): () => void {
  if (typeof window === "undefined" || installed) return () => undefined;
  installed = true;

  function handleGesture() {
    unlock();
    // resume() settles asynchronously; stop listening only once it worked.
    queueMicrotask(() => {
      if (isRunning()) remove();
    });
    setTimeout(() => {
      if (isRunning()) remove();
    }, 250);
  }
  function remove() {
    GESTURE_EVENTS.forEach((type) => window.removeEventListener(type, handleGesture, true));
  }

  GESTURE_EVENTS.forEach((type) => window.addEventListener(type, handleGesture, { capture: true, passive: true }));
  return () => {
    remove();
    installed = false;
  };
}

/**
 * Plays a short two-note chime if the browser currently permits audio;
 * otherwise does nothing. Never throws. Returns whether it actually played.
 */
export function playNotificationChime(): boolean {
  try {
    if (!context || context.state !== "running") return false;
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
    return true;
  } catch {
    // Audio is a nicety — a failure here must never surface to the user.
    return false;
  }
}
