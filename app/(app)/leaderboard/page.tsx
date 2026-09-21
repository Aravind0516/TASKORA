import type { Metadata } from "next";
import { LeaderboardView } from "@/components/credits/leaderboard-view";

export const metadata: Metadata = { title: "Leaderboard · TASKORA" };

export default function LeaderboardPage() {
  return <LeaderboardView />;
}
