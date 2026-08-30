import { ConfirmAction } from "@/components/ui/confirm-action";
import { addDaysYmd } from "@/lib/time/zoned";
import { formatTimezone } from "@/utils/date";
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi, Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { myManagerLocationsQueryOptions } from "../../-data-access-layer/manager-locations.query-options";
import {
  deleteManagerWeek,
  publishManagerWeek,
  unpublishManagerWeek,
} from "../../-data-access-layer/manager-schedule.fn";
import { managerWeekScheduleQueryOptions } from "../../-data-access-layer/manager-schedule.query-options";
import { ManagerScheduleWeekBoard } from "./ManagerScheduleWeekBoard";
import { ManagerShiftSheet, type ManagerShiftPanel } from "./ManagerShiftSheet";

const ROUTE_ID = "/_dashboard/manager/schedule/$locationId/$weekStart";
const routeApi = getRouteApi(ROUTE_ID);

export function ManagerSchedule() {
  const { locationId, weekStart } = routeApi.useParams();
  const navigate = routeApi.useNavigate();
  const queryClient = useQueryClient();
  const { data: locationsData } = useSuspenseQuery(myManagerLocationsQueryOptions());
  const locations = locationsData.items;
  const selectedLocation = locations.find((location) => location.id === locationId);
  const [editing, setEditing] = useState(false);
  const [panel, setPanel] = useState<ManagerShiftPanel | null>(null);

  const scheduleQuery = useQuery(managerWeekScheduleQueryOptions({ locationId, weekStart }));
  const schedule = scheduleQuery.data;

  const goTo = (next: { locationId: string; weekStart: string }) => {
    void navigate({
      to: "/manager/schedule/$locationId/$weekStart",
      params: next,
    });
  };

  const invalidateSchedule = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["manager-schedule"] }),
      queryClient.invalidateQueries({ queryKey: ["manager-schedules"] }),
      queryClient.invalidateQueries({ queryKey: ["staff-schedule"] }),
    ]);
  };

  const publish = useMutation({
    mutationFn: () => publishManagerWeek({ data: { locationId, weekStart } }),
    onSuccess: async () => {
      await invalidateSchedule();
      toast.success("Week published. Assigned staff can now see these shifts.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not publish.");
    },
  });

  const unpublish = useMutation({
    mutationFn: () => unpublishManagerWeek({ data: { locationId, weekStart } }),
    onSuccess: async () => {
      await invalidateSchedule();
      toast.success("Week unpublished. Staff can no longer see these shifts.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not unpublish.");
    },
  });

  const remove = useMutation({
    mutationFn: () => deleteManagerWeek({ data: { locationId, weekStart } }),
    onSuccess: async () => {
      await invalidateSchedule();
      toast.success("Week deleted.");
      await navigate({ to: "/manager/schedule" });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not delete this week.");
    },
  });

  if (!selectedLocation) {
    return (
      <p className="text-muted-foreground text-sm" data-test="manager-schedule-unknown-location">
        You do not manage this location.
      </p>
    );
  }

  const weekEnd = schedule?.weekEnd ?? addDaysYmd(weekStart, 6);
  const published = schedule?.published ?? false;
  const cutoffHours = schedule?.cutoffHours ?? 48;
  const shiftCount = schedule?.days.reduce((total, day) => total + day.shifts.length, 0);
  const canDelete = (schedule?.lockedShiftCount ?? 0) === 0;

  let status = "Loading this week…";
  if (scheduleQuery.isError) status = "This week could not be loaded.";
  if (schedule && shiftCount !== undefined) {
    status = published
      ? `${shiftCount} shifts · visible to assigned staff`
      : `${shiftCount} shifts · draft — staff cannot see this week`;
  }

  return (
    <div className="flex flex-col gap-6" data-test="manager-schedule">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Link to="/manager/schedule" className="btn btn-ghost btn-sm">
            All schedules
          </Link>
          <select
            className="select-bordered select select-sm min-w-52"
            value={selectedLocation.id}
            aria-label="Location"
            onChange={(event) => goTo({ locationId: event.target.value, weekStart })}
          >
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>
          <span className={`badge badge-sm ${published ? "badge-success" : "badge-ghost"}`}>
            {published ? "Published" : "Draft"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-square"
            aria-label="Previous week"
            onClick={() =>
              goTo({ locationId: selectedLocation.id, weekStart: addDaysYmd(weekStart, -7) })
            }
          >
            <ChevronLeft className="size-4" />
          </button>
          <p className="min-w-44 text-center text-sm font-medium tabular-nums">
            {weekStart} – {weekEnd}
          </p>
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-square"
            aria-label="Next week"
            onClick={() =>
              goTo({ locationId: selectedLocation.id, weekStart: addDaysYmd(weekStart, 7) })
            }
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted-foreground text-sm">
          {status}
          {` · ${formatTimezone(selectedLocation.timezone)}`}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={editing ? "btn btn-primary btn-sm" : "btn btn-outline btn-sm"}
            data-test="manager-edit-week"
            onClick={() => {
              setEditing((current) => {
                const next = !current;
                if (!next) setPanel(null);
                return next;
              });
            }}
          >
            {editing ? "Done" : "Edit"}
          </button>
          {editing ? (
            <button
              type="button"
              className="btn btn-outline btn-sm"
              data-test="manager-add-shift"
              onClick={() =>
                setPanel({
                  kind: "create",
                  locationId: selectedLocation.id,
                  startDate: weekStart,
                })
              }
            >
              Add shift
            </button>
          ) : null}
          {published ? (
            <button
              type="button"
              className="btn btn-outline btn-sm"
              disabled={unpublish.isPending || !schedule?.canUnpublish}
              onClick={() => unpublish.mutate()}
              data-test="manager-unpublish-week"
            >
              Unpublish
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={publish.isPending || scheduleQuery.isPending}
              onClick={() => publish.mutate()}
              data-test="manager-publish-week"
            >
              Publish week
            </button>
          )}
          <ConfirmAction
            title="Delete this week?"
            description="All shifts in this week will be removed. Assigned staff lose those assignments. This cannot be undone."
            confirmLabel="Delete week"
            disabled={remove.isPending || !canDelete}
            onConfirm={() => remove.mutate()}
          >
            <button
              type="button"
              className="btn btn-outline btn-sm text-destructive"
              disabled={remove.isPending || !canDelete}
              data-test="manager-delete-week"
            >
              Delete
            </button>
          </ConfirmAction>
        </div>
      </div>

      {published && schedule && !schedule.canUnpublish ? (
        <p className="text-muted-foreground text-xs">
          Unpublish is locked because a shift starts within {cutoffHours} hours.
        </p>
      ) : null}

      {!canDelete && schedule ? (
        <p className="text-muted-foreground text-xs">
          Delete is locked because a shift starts within {cutoffHours} hours.
        </p>
      ) : null}

      {scheduleQuery.isError ? (
        <p className="text-destructive text-sm">
          {scheduleQuery.error instanceof Error
            ? scheduleQuery.error.message
            : "Could not load this week."}
        </p>
      ) : null}

      {editing ? (
        <p className="text-muted-foreground text-xs">
          Click a shift to edit it, or a day to add one.
        </p>
      ) : null}

      {schedule ? (
        <ManagerScheduleWeekBoard
          days={schedule.days}
          timezone={schedule.location.timezone}
          editing={editing}
          onSelectShift={(shiftId) => {
            const shift = schedule.days
              .flatMap((day) => day.shifts)
              .find((item) => item.id === shiftId);
            if (!shift) return;
            setPanel({
              kind: "edit",
              locationId: selectedLocation.id,
              shift,
              published,
            });
          }}
          onAddDay={(date) =>
            setPanel({
              kind: "create",
              locationId: selectedLocation.id,
              startDate: date,
            })
          }
        />
      ) : null}

      <ManagerShiftSheet panel={panel} onClose={() => setPanel(null)} />
    </div>
  );
}
