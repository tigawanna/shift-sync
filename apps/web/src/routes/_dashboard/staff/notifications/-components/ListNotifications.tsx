import { TSRListPagination } from "@/components/pagination/TSRListPagination";
import { SearchBox } from "@/components/search/SearchBox";
import { usePageSearchQuery } from "@/components/search/use-page-search-query";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { isCoverageNotification } from "@/lib/schedule/notification-href";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi, useNavigate } from "@tanstack/react-router";
import {
  markAllNotificationsRead,
  markNotificationRead,
  setNotificationPreference,
} from "../../../-data-access-layer/notifications.fn";
import { myNotificationsQueryOptions } from "../../../-data-access-layer/notifications.query-options";

const ROUTE_ID = "/_dashboard/staff/notifications/";
const routeApi = getRouteApi(ROUTE_ID);

export function ListNotifications() {
  const queryClient = useQueryClient();
  const { inputValue, onSearchChange, isDebouncing, clearSearch } = usePageSearchQuery(ROUTE_ID);
  const search = routeApi.useSearch();
  const navigate = routeApi.useNavigate();
  const goTo = useNavigate();
  const page = search.page;
  const perPage = search.perPage;
  const sq = search.sq.trim();
  const unread = search.unread;
  const hasSearch = sq.length > 0;

  const { data } = useSuspenseQuery(myNotificationsQueryOptions({ page, perPage, sq, unread }));
  const { items, total, totalPages, unreadCount, emailSimulation } = data;

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["notifications"] });

  const markOne = useMutation({
    mutationFn: (notificationId: string) => markNotificationRead({ data: { notificationId } }),
    onSuccess: invalidate,
  });
  const markAll = useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: invalidate,
  });
  const setPref = useMutation({
    mutationFn: (next: boolean) => setNotificationPreference({ data: { emailSimulation: next } }),
    onSuccess: invalidate,
  });

  return (
    <section className="flex h-full w-full flex-col gap-4" data-test="staff-notifications-list">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <p className="text-muted-foreground font-mono text-xs">
          {total} {total === 1 ? "notification" : "notifications"}
          {unreadCount > 0 ? ` · ${unreadCount} unread` : ""}
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex gap-1">
            <Button
              type="button"
              size="sm"
              variant={unread === "all" ? "default" : "outline"}
              onClick={() => {
                void navigate({
                  to: ".",
                  search: (prev) => ({ ...prev, unread: "all", page: undefined }),
                  replace: true,
                });
              }}
            >
              All
            </Button>
            <Button
              type="button"
              size="sm"
              variant={unread === "unread" ? "default" : "outline"}
              onClick={() => {
                void navigate({
                  to: ".",
                  search: (prev) => ({ ...prev, unread: "unread", page: undefined }),
                  replace: true,
                });
              }}
            >
              Unread
            </Button>
          </div>
          <SearchBox
            keyword={inputValue}
            setKeyword={(value) => onSearchChange(value)}
            isDebouncing={isDebouncing}
            placeholder="Search title or message"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3">
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            className="toggle toggle-sm"
            checked={emailSimulation}
            onChange={(event) => setPref.mutate(event.target.checked)}
          />
          Also simulate email
        </label>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={unreadCount === 0 || markAll.isPending}
          onClick={() => markAll.mutate()}
        >
          Mark all read
        </Button>
      </div>

      {items.length === 0 ? (
        <Empty data-test="notifications-empty" className="min-h-[40dvh]">
          <EmptyHeader>
            <EmptyTitle>
              {hasSearch
                ? `No results for “${sq}”`
                : unread === "unread"
                  ? "No unread notifications"
                  : "No notifications yet"}
            </EmptyTitle>
            <EmptyDescription>
              {hasSearch
                ? "Try a different word from the title or message."
                : "Publishes, assignments, and swap updates land here."}
            </EmptyDescription>
          </EmptyHeader>
          {hasSearch ? (
            <EmptyContent>
              <button type="button" className="btn btn-ghost btn-sm" onClick={clearSearch}>
                Clear search
              </button>
            </EmptyContent>
          ) : null}
        </Empty>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item) => {
            const unreadItem = item.readAt === null;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  className="hover:bg-muted/40 w-full rounded-xl border p-4 text-left"
                  onClick={() => {
                    if (unreadItem) markOne.mutate(item.id);
                    if (isCoverageNotification(item.kind)) {
                      void goTo({
                        to: "/staff/coverage",
                        search: { status: "pending", page: 1 },
                      });
                      return;
                    }
                    void goTo({ to: "/staff" });
                  }}
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-medium">
                      {item.title}
                      {unreadItem ? (
                        <span className="text-primary ml-2 text-[10px] uppercase">unread</span>
                      ) : null}
                    </p>
                    <p className="text-muted-foreground font-mono text-xs">
                      {new Date(item.createdAt).toISOString()}
                    </p>
                  </div>
                  <p className="text-muted-foreground mt-1 text-sm">{item.body}</p>
                  {item.emailSimulated ? (
                    <p className="text-muted-foreground mt-2 text-[11px]">Email simulated</p>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <TSRListPagination routeID={ROUTE_ID} totalPages={totalPages} />
    </section>
  );
}
