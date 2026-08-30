import {
  LIVE_PULSE_QUERY_KEY,
  livePulseQueryOptions,
} from "@/routes/_dashboard/-data-access-layer/live-pulse.query-options";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

/**
 * Polls one cheap aggregate and invalidates the dashboard's active queries when
 * it changes, so a publish or a swap shows up in a few seconds without holding a
 * socket open on a serverless host.
 */
export function useLivePulse() {
  const queryClient = useQueryClient();
  const { data } = useQuery(livePulseQueryOptions());
  const seen = useRef<string | null>(null);

  useEffect(() => {
    if (!data) return;

    // First read is the baseline; invalidating on it would double-fetch the page.
    if (seen.current === null) {
      seen.current = data.version;
      return;
    }
    if (seen.current === data.version) return;

    seen.current = data.version;
    void queryClient.invalidateQueries({
      predicate: (query) => query.queryKey[0] !== LIVE_PULSE_QUERY_KEY,
    });
  }, [data, queryClient]);
}
