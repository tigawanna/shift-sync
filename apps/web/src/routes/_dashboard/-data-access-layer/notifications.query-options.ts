import { LIVE_SCHEDULE_REFETCH_MS } from "@/lib/schedule/oversight";
import { queryOptions } from "@tanstack/react-query";
import { listMyNotifications } from "./notifications.fn";

export function myNotificationsQueryOptions() {
  return queryOptions({
    queryKey: ["notifications"],
    queryFn: () => listMyNotifications(),
    refetchInterval: LIVE_SCHEDULE_REFETCH_MS,
  });
}
