import type { Task } from "@/types/task";

export interface CompletionTrendPoint {
  week: string;
  completed: number;
}

const WEEKS_IN_TREND = 8;
const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

function startOfWeek(date: Date): Date {
  const result = new Date(date);
  const day = result.getDay();
  const diff = (day + 6) % 7; // week starts Monday
  result.setHours(0, 0, 0, 0);
  result.setDate(result.getDate() - diff);
  return result;
}

export function buildCompletionTrend(tasks: Task[], now: Date): CompletionTrendPoint[] {
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
