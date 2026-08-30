import { LIVE_PULSE_REFETCH_MS } from "@/lib/schedule/oversight";
import { queryOptions } from "@tanstack/react-query";
import { getLivePulse } from "./live-pulse.fn";

export const LIVE_PULSE_QUERY_KEY = "live-pulse";

export function livePulseQueryOptions() {
  return queryOptions({
    queryKey: [LIVE_PULSE_QUERY_KEY],
    queryFn: () => getLivePulse(),
    refetchInterval: LIVE_PULSE_REFETCH_MS,
    refetchIntervalInBackground: false,
  });
}
