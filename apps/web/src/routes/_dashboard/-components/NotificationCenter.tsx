import {
  markAllNotificationsRead,
  markNotificationRead,
  setNotificationPreference,
} from "../-data-access-layer/notifications.fn";
import { myNotificationsQueryOptions } from "../-data-access-layer/notifications.query-options";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";

export function NotificationCenter() {
  const queryClient = useQueryClient();
  const query = useQuery(myNotificationsQueryOptions());
  const data = query.data;
  const unread = data?.unreadCount ?? 0;

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
    mutationFn: (emailSimulation: boolean) =>
      setNotificationPreference({ data: { emailSimulation } }),
    onSuccess: invalidate,
  });

  return (
    <details className="dropdown dropdown-end">
      <summary className="btn btn-ghost btn-sm relative" data-test="notification-center">
        <Bell className="size-4" />
        {unread > 0 ? (
          <span className="bg-primary text-primary-foreground absolute -top-1 -right-1 min-w-4 rounded-full px-1 text-[10px] font-semibold">
            {unread}
          </span>
        ) : null}
      </summary>
      <div className="dropdown-content bg-card z-50 mt-2 w-80 rounded-xl border p-3 shadow-lg">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-sm font-semibold">Notifications</p>
          <button
            type="button"
            className="btn btn-ghost btn-xs"
            disabled={unread === 0 || markAll.isPending}
            onClick={() => markAll.mutate()}
          >
            Mark all read
          </button>
        </div>
        <label className="mb-3 flex items-center justify-between gap-2 text-xs">
          <span>Also simulate email</span>
          <input
            type="checkbox"
            className="toggle toggle-sm"
            checked={data?.emailSimulation ?? false}
            onChange={(event) => setPref.mutate(event.target.checked)}
          />
        </label>
        <ul className="flex max-h-80 flex-col gap-2 overflow-y-auto">
          {(data?.items ?? []).length === 0 ? (
            <li className="text-muted-foreground text-xs">No notifications yet.</li>
          ) : (
            (data?.items ?? []).map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className="hover:bg-muted/40 w-full rounded-lg p-2 text-left"
                  onClick={() => {
                    if (!item.readAt) markOne.mutate(item.id);
                  }}
                >
                  <p className="text-sm font-medium">
                    {item.title}
                    {item.readAt ? null : (
                      <span className="text-primary ml-2 text-[10px] uppercase">unread</span>
                    )}
                  </p>
                  <p className="text-muted-foreground text-xs">{item.body}</p>
                  {item.emailSimulated ? (
                    <p className="text-muted-foreground text-[10px]">Email simulated</p>
                  ) : null}
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </details>
  );
}
