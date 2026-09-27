import type { Metadata } from "next";
import { LeaderboardView } from "@/components/credits/leaderboard-view";

export const metadata: Metadata = { title: "Admin · Leaderboard" };

// The organization's leaderboard, inside the admin console — see lib/shell-routes.ts.
export default function AdminLeaderboardPage() {
  return <LeaderboardView />;
}
