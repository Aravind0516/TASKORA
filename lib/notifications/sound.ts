"use client";

// TASKORA's ONE centralized notification sound — a short, synthesized
// two-note chime via the Web Audio API, not a bundled audio file (no asset
// to source/license, and it stays a single ~1KB implementation instead of a
// binary dependency). Every other part of the app must call
// playNotificationSound() from here — never `new Audio(...).play()` inline
// in a component (see the notification-popup spec this implements).
//
// One shared AudioContext for the whole app, created lazily. Browsers block
// audio playback before the user has interacted with the page at all
// (autoplay policy) — unlockNotificationAudio() resumes the shared context
// and must be called once from a real user gesture (see
// NotificationExperienceProvider, which wires this to the first
// click/keydown after the shell mounts). Every function here is
// fail-silent: a blocked or unsupported AudioContext must never throw or
// surface an error anywhere else in the app — the popup/notification itself
// always works regardless of whether sound does.

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!audioContext) {
    try {
      audioContext = new Ctor();
    } catch {
      return null;
    }
  }
  return audioContext;
}

/**
 * Call once from a genuine user gesture (click/keydown) — resumes the
 * shared AudioContext so later, programmatically-triggered
 * playNotificationSound() calls (arriving from a live Firestore listener,
 * not a click) aren't silently blocked by the browser's autoplay policy.
 * Safe to call repeatedly/redundantly.
 */
export function unlockNotificationAudio(): void {
  const ctx = getAudioContext();
  if (!ctx || ctx.state !== "suspended") return;
  ctx.resume().catch(() => {
    // Still blocked — playNotificationSound() will just no-op later too.
  });
}

function playTone(ctx: AudioContext, startAt: number, frequency: number, duration: number, peakGain: number): void {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = "sine";
  oscillator.frequency.value = frequency;
  // Soft envelope — quick fade in, gentle exponential fade out. A "ding,"
  // not a beep; deliberately quiet and short (see Part 11/26 of the
  // notification-popup spec: professional, subtle, not annoying).
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.linearRampToValueAtTime(peakGain, startAt + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + duration + 0.02);
}

/**
 * Plays the one centralized notification chime — a rising two-note interval
 * (~220ms total), clearly distinguishable from a harsher/lower error tone
 * (this app never plays an error sound at all, so there's no collision).
 * Never throws: if Web Audio is unavailable or still autoplay-blocked, this
 * silently does nothing — callers never need to wrap this in try/catch.
 */
export function playNotificationSound(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
      if (ctx.state === "suspended") return;
    }
    const now = ctx.currentTime;
    playTone(ctx, now, 880, 0.1, 0.11);
    playTone(ctx, now + 0.08, 1175, 0.13, 0.1);
  } catch {
    // Fail silent — sound is never allowed to be the reason anything else breaks.
  }
}
