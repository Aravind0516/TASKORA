"use client";

import { useEffect, useState } from "react";
import * as creditService from "@/lib/services/credit.service";
import type { LeaderboardEntry } from "@/types/credit";

interface LeaderboardState {
  organizationId: string | null;
  entries: LeaderboardEntry[] | null;
  error: string | null;
}

/**
 * Live leaderboardStats for ONE organization — the small per-member aggregate
 * (never the transaction ledger). Scoped by organizationId in the query and by
 * firestore.rules' leaderboardStats read rule, so a member can only ever
 * receive their own organization's rows. Results are only returned for the
 * organization currently requested, so switching organizations can never
 * briefly show another organization's data.
 */
export function useOrgLeaderboard(organizationId: string | null | undefined): { entries: LeaderboardEntry[] | null; error: string | null } {
  const [state, setState] = useState<LeaderboardState>({ organizationId: null, entries: null, error: null });

  useEffect(() => {
    if (!organizationId) return;
    return creditService.subscribeToLeaderboard(
      organizationId,
      (entries) => setState({ organizationId, entries, error: null }),
      (error) => setState({ organizationId, entries: null, error })
    );
  }, [organizationId]);

  if (!organizationId || state.organizationId !== organizationId) return { entries: null, error: null };
  return { entries: state.entries, error: state.error };
}
