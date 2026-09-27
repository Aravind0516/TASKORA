import { monthKey, weekStartKey } from "@/lib/credits/periods";
import type { LeaderboardEntry } from "@/types/credit";

// Shared ranking for every leaderboard surface (full page, dashboard widgets,
// leader spotlight) so they can never disagree. Input is the organization's
// leaderboardStats aggregate — one small document per credited member, already
// scoped to the viewer's organization by the query and firestore.rules — never
// the raw transaction ledger.

export type LeaderboardPeriod = "weekly" | "monthly" | "lifetime";

export interface RankedLeaderboardEntry {
  entry: LeaderboardEntry;
  /** Net credits for the period (awards minus deductions). */
  score: number;
  /** Competition ranking: equal scores share a rank (1, 1, 3). */
  rank: number;
}

export function periodScore(entry: LeaderboardEntry, period: LeaderboardPeriod): number {
  if (period === "weekly") return entry.weeklyCredits;
  if (period === "monthly") return entry.monthlyCredits;
  return entry.lifetimeCredits;
}

/**
 * Whether this member had any credit activity in the CURRENT period. The
 * stored period key only changes when a ledger entry is written, so a matching
 * key means at least one award or deduction this week/month — including a
 * period whose awards and deductions net out to zero.
 */
export function hadActivity(entry: LeaderboardEntry, period: LeaderboardPeriod, now: Date = new Date()): boolean {
  if (period === "weekly") return entry.weekStartDate === weekStartKey(now);
  if (period === "monthly") return entry.monthKey === monthKey(now);
  return true;
}

/**
 * Members with activity in the period, highest net score first. Ties are
 * broken deterministically (display name, then uid) so the order never
 * shuffles between renders, and tied members share the same rank.
 */
export function rankLeaderboard(entries: readonly LeaderboardEntry[], period: LeaderboardPeriod, now: Date = new Date()): RankedLeaderboardEntry[] {
  const sorted = entries
    .filter((e) => hadActivity(e, period, now))
    .map((entry) => ({ entry, score: periodScore(entry, period) }))
    .sort((a, b) => b.score - a.score || a.entry.displayName.localeCompare(b.entry.displayName) || a.entry.uid.localeCompare(b.entry.uid));

  let previousScore: number | null = null;
  let previousRank = 0;
  return sorted.map((row, index) => {
    const rank = previousScore !== null && row.score === previousScore ? previousRank : index + 1;
    previousScore = row.score;
    previousRank = rank;
    return { ...row, rank };
  });
}

/** The period's leader(s): everyone sharing rank 1 with a positive net score. Empty when nobody has earned credits yet. */
export function periodLeaders(entries: readonly LeaderboardEntry[], period: LeaderboardPeriod, now: Date = new Date()): RankedLeaderboardEntry[] {
  return rankLeaderboard(entries, period, now).filter((row) => row.rank === 1 && row.score > 0);
}
