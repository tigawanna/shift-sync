import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getUserAppRole, isStaffUser, useViewer } from "@/data-access-layer/auth/viewer";
import { hrefForNotification } from "@/lib/schedule/notification-href";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { useState } from "react";
import {
  markAllNotificationsRead,
  markNotificationRead,
  setNotificationPreference,
} from "../-data-access-layer/notifications.fn";
import { myNotificationsQueryOptions } from "../-data-access-layer/notifications.query-options";

export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { viewer } = useViewer();
  const navigate = useNavigate();
  const role = getUserAppRole(viewer.user);
  const query = useQuery(
    myNotificationsQueryOptions({ page: 1, perPage: 8, sq: "", unread: "all" }),
  );
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
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="relative"
            data-test="notification-center"
          />
        }
      >
        <Bell className="size-4" />
        {unread > 0 ? (
          <span className="bg-primary text-primary-foreground absolute -top-1 -right-1 min-w-4 rounded-full px-1 text-[10px] font-semibold">
            {unread}
          </span>
        ) : null}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-sm font-semibold">Notifications</p>
          <Button
            type="button"
            size="xs"
            variant="ghost"
            disabled={unread === 0 || markAll.isPending}
            onClick={() => markAll.mutate()}
          >
            Mark all read
          </Button>
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
                    setOpen(false);
                    void navigate({ to: hrefForNotification(item.kind, role) });
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
        {isStaffUser(viewer.user) ? (
          <Link
            to="/staff/notifications"
            className="text-primary mt-3 block text-center text-xs font-medium"
            onClick={() => setOpen(false)}
          >
            Open notification center
          </Link>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
