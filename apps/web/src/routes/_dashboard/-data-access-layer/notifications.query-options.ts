import { ADMIN_LIST_PER_PAGE } from "@/components/pagination/constants";
import { LIVE_SCHEDULE_REFETCH_MS } from "@/lib/schedule/oversight";
import { queryOptions } from "@tanstack/react-query";
import { listMyNotifications, type ListMyNotificationsInput } from "./notifications.fn";

export function myNotificationsQueryOptions(input: ListMyNotificationsInput = {}) {
  const page = input.page ?? 1;
  const perPage = input.perPage ?? ADMIN_LIST_PER_PAGE;
  const sq = input.sq ?? "";
  const unread = input.unread ?? "all";

  return queryOptions({
    queryKey: ["notifications", { page, perPage, sq, unread }],
    queryFn: () => listMyNotifications({ data: { page, perPage, sq, unread } }),
    refetchInterval: LIVE_SCHEDULE_REFETCH_MS,
  });
}
