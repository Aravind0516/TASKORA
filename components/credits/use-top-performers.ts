"use client";

import { useEffect, useState } from "react";
import { subscribeToTopPerformers } from "@/lib/services/top-performer.service";
import type { PerformerPeriod, TopPerformer } from "@/types/top-performer";

interface State {
  organizationId: string | null;
  performers: TopPerformer[] | null;
  error: string | null;
}

/**
 * Live admin-published Top Performers for ONE organization (weekly and
 * monthly). Scoped by organizationId in the query and firestore.rules, and
 * only ever returned for the organization currently requested.
 */
export function useTopPerformers(organizationId: string | null | undefined): {
  weekly: TopPerformer | null;
  monthly: TopPerformer | null;
  loaded: boolean;
  error: string | null;
} {
  const [state, setState] = useState<State>({ organizationId: null, performers: null, error: null });

  useEffect(() => {
    if (!organizationId) return;
    return subscribeToTopPerformers(
      organizationId,
      (performers) => setState({ organizationId, performers, error: null }),
      (error) => setState({ organizationId, performers: [], error })
    );
  }, [organizationId]);

  const current = organizationId && state.organizationId === organizationId ? state : null;
  const pick = (period: PerformerPeriod) => current?.performers?.find((p) => p.period === period) ?? null;
  return { weekly: pick("weekly"), monthly: pick("monthly"), loaded: Boolean(current?.performers), error: current?.error ?? null };
}
