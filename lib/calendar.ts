// Pure date helpers for components/calendar/calendar-view.tsx — kept here so
// the navigation arithmetic can be tested independently of React.

export type CalendarViewMode = "month" | "week";

/** Local-calendar "YYYY-MM-DD" key for a Date. */
export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Monday 00:00 of the week containing `date` (matches lib/analytics.ts). */
export function startOfWeek(date: Date): Date {
  const result = new Date(date);
  const diff = (result.getDay() + 6) % 7;
  result.setHours(0, 0, 0, 0);
  result.setDate(result.getDate() - diff);
  return result;
}

/**
 * Moves the calendar anchor one period back (-1) or forward (+1).
 *
 * Month view always lands on the 1st of the target month. The previous
 * implementation called setMonth(month ± 1) on the anchor's full date, and
 * JavaScript rolls a day that doesn't exist in the target month over into
 * the next one: from Oct 31, "Next" produced Dec 1 (November skipped); from
 * Mar 31, "Previous" produced Mar 3 (never left March).
 */
export function shiftAnchor(anchor: Date, mode: CalendarViewMode, direction: -1 | 1): Date {
  if (mode === "month") return new Date(anchor.getFullYear(), anchor.getMonth() + direction, 1);
  const next = new Date(anchor);
  next.setDate(next.getDate() + 7 * direction);
  return next;
}

/**
 * Day key for a stored due date. Date-only values ("2026-10-01", what the
 * date inputs store) are calendar dates, not instants — used as-is instead of
 * going through `new Date()`, which parses them as UTC midnight and would
 * show them a day early for anyone west of UTC.
 */
export function dueDateKey(dueDate: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(dueDate) ? dueDate : dateKey(new Date(dueDate));
}
