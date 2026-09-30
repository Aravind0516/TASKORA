"use client";

import { useEffect, useState } from "react";
import { fetchTopPerformers, onTopPerformersChanged } from "@/lib/services/top-performer.service";
import type { PerformerPeriod, TopPerformer } from "@/types/top-performer";

interface State {
  organizationId: string | null;
  performers: TopPerformer[] | null;
  error: string | null;
}

/** Recognitions change at most a few times a week — re-check occasionally, on tab focus, and immediately after a publish. */
const REFRESH_MS = 5 * 60 * 1000;

/**
 * Admin-published Top Performers for ONE organization (weekly and monthly),
 * scoped server-side to the caller's own organization and only ever
 * returned for the organization currently requested.
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
    let cancelled = false;
    const load = () =>
      fetchTopPerformers(organizationId).then(
        (performers) => !cancelled && setState({ organizationId, performers, error: null }),
        (e: unknown) =>
          !cancelled &&
          setState((prev) => ({
            organizationId,
            // Keep what was already shown if a background refresh fails.
            performers: prev.organizationId === organizationId && prev.performers ? prev.performers : [],
            error: e instanceof Error ? e.message : "Top Performers are unavailable right now.",
          }))
      );
    load();
    const onFocus = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onFocus);
    const stopListening = onTopPerformersChanged(load);
    const interval = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onFocus);
      stopListening();
      clearInterval(interval);
    };
  }, [organizationId]);

  const current = organizationId && state.organizationId === organizationId ? state : null;
  const pick = (period: PerformerPeriod) => current?.performers?.find((p) => p.period === period) ?? null;
  return { weekly: pick("weekly"), monthly: pick("monthly"), loaded: Boolean(current?.performers), error: current?.error ?? null };
}
