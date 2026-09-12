import type { PlatformTask } from "@/types/platform";

export interface TrendPoint {
  week: string;
  completed: number;
}

const MONTHS_IN_TREND = 6;
const REFERENCE_NOW = new Date("2026-09-05");

/** Cumulative count of `createdAt` timestamps landing in each of the last N months — used for growth trend charts. */
export function buildMonthlyGrowth(createdAtDates: string[], months = MONTHS_IN_TREND): TrendPoint[] {
  const buckets: { label: string; start: Date; end: Date }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const start = new Date(REFERENCE_NOW.getFullYear(), REFERENCE_NOW.getMonth() - i, 1);
    const end = new Date(REFERENCE_NOW.getFullYear(), REFERENCE_NOW.getMonth() - i + 1, 1);
    buckets.push({ label: start.toLocaleDateString("en-US", { month: "short" }), start, end });
  }

  return buckets.map((bucket) => ({
    week: bucket.label,
    completed: createdAtDates.filter((d) => {
      const t = new Date(d).getTime();
      return t >= bucket.start.getTime() && t < bucket.end.getTime();
    }).length,
  }));
}

const WEEKS_IN_TREND = 8;
const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

function startOfWeek(date: Date): Date {
  const result = new Date(date);
  const day = result.getDay();
  const diff = (day + 6) % 7;
  result.setHours(0, 0, 0, 0);
  result.setDate(result.getDate() - diff);
  return result;
}

/** Mirrors lib/analytics.ts's buildCompletionTrend, retyped for PlatformTask. */
export function buildPlatformCompletionTrend(tasks: PlatformTask[], now: Date = new Date("2026-09-05")): TrendPoint[] {
  const currentWeekStart = startOfWeek(now);
  const weekStarts: Date[] = [];
  for (let i = WEEKS_IN_TREND - 1; i >= 0; i--) {
    weekStarts.push(new Date(currentWeekStart.getTime() - i * MS_PER_WEEK));
  }

  const counts = weekStarts.map(() => 0);
  const completedTasks = tasks.filter((task) => task.status === "Completed");

  for (const task of completedTasks) {
    const completedAt = new Date(task.updatedAt).getTime();
    for (let i = 0; i < weekStarts.length; i++) {
      const weekStart = weekStarts[i].getTime();
      const weekEnd = weekStart + MS_PER_WEEK;
      if (completedAt >= weekStart && completedAt < weekEnd) {
        counts[i] += 1;
        break;
      }
    }
  }

  return weekStarts.map((date, index) => ({
    week: date.toLocaleDateString("en-US", { month: "short", day: "2-digit" }),
    completed: counts[index],
  }));
}
