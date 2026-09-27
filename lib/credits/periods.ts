// The ONE definition of "this week" / "this month" for credits and the
// leaderboard, shared by the server (lib/server/credits.ts, which files every
// ledger entry under a week/month key) and the browser (which decides whether
// a stored weekly/monthly total is current). They previously each used their
// own machine clock — UTC on the server, the viewer's zone in the browser —
// so e.g. credits awarded early on an IST Monday were filed under the previous
// week and then shown as 0. Both now compute periods in the organization's
// time zone.
//
// Weeks run Monday–Sunday. Keys keep the stored formats ("YYYY-MM-DD" of the
// Monday, "YYYY-MM"), so every existing leaderboardStats document stays valid.

/**
 * TASKORA organizations don't store a time zone yet; every organization on
 * the platform is currently India-based (INR billing), so their local time is
 * India Standard Time. Centralized here so a future per-organization setting
 * only has to change this one lookup.
 */
export const ORGANIZATION_TIME_ZONE = "Asia/Kolkata";

interface ZonedDate {
  year: number;
  month: number; // 1-12
  day: number;
  /** 0 = Monday … 6 = Sunday */
  weekdayFromMonday: number;
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function zoned(date: Date, timeZone: string): ZonedDate {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", weekday: "short" }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";
  return { year: Number(get("year")), month: Number(get("month")), day: Number(get("day")), weekdayFromMonday: WEEKDAYS.indexOf(get("weekday")) };
}

const pad = (n: number) => String(n).padStart(2, "0");

/** "YYYY-MM-DD" of the Monday that starts the week containing `date`, in the organization's time zone. */
export function weekStartKey(date: Date = new Date(), timeZone: string = ORGANIZATION_TIME_ZONE): string {
  const z = zoned(date, timeZone);
  const monday = new Date(Date.UTC(z.year, z.month - 1, z.day - z.weekdayFromMonday));
  return `${monday.getUTCFullYear()}-${pad(monday.getUTCMonth() + 1)}-${pad(monday.getUTCDate())}`;
}

/** "YYYY-MM" of the month containing `date`, in the organization's time zone. */
export function monthKey(date: Date = new Date(), timeZone: string = ORGANIZATION_TIME_ZONE): string {
  const z = zoned(date, timeZone);
  return `${z.year}-${pad(z.month)}`;
}

/** "Sep 21 – Sep 27" for a week key (calendar dates — no time-zone shifting). */
export function weekRangeLabel(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, d));
  const end = new Date(Date.UTC(y, m - 1, d + 6));
  const fmt = (dt: Date) => dt.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  return `${fmt(start)} – ${fmt(end)}`;
}

/** "September 2026" for a month key. */
export function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}
