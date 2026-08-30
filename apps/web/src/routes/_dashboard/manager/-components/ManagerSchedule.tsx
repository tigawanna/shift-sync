import { addDaysYmd, mondayOfWeekContaining } from "@/lib/time/zoned";
import { formatTimezone } from "@/utils/date";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";
import { myManagerLocationsQueryOptions } from "../-data-access-layer/manager-locations.query-options";
import {
  publishManagerWeek,
  unpublishManagerWeek,
} from "../-data-access-layer/manager-schedule.fn";
import { managerWeekScheduleQueryOptions } from "../-data-access-layer/manager-schedule.query-options";
import { Route } from "../schedule/index";
import { ManagerScheduleWeekBoard } from "./manager-schedule/ManagerScheduleWeekBoard";

export function ManagerSchedule() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const queryClient = useQueryClient();
  const locationsQuery = useQuery(myManagerLocationsQueryOptions());
  const locations = locationsQuery.data?.items ?? [];
  const selectedLocation =
    locations.find((location) => location.id === search.locationId) ?? locations[0];
  const weekStart =
    search.week ??
    (selectedLocation
      ? mondayOfWeekContaining(new Date(), selectedLocation.timezone)
      : mondayOfWeekContaining(new Date(), "UTC"));

  useEffect(() => {
    if (!selectedLocation) return;
    if (search.locationId === selectedLocation.id && search.week === weekStart) return;
    void navigate({
      search: { locationId: selectedLocation.id, week: weekStart },
      replace: true,
    });
  }, [navigate, search.locationId, search.week, selectedLocation, weekStart]);

  const scheduleQuery = useQuery({
    ...managerWeekScheduleQueryOptions({
      locationId: selectedLocation?.id ?? "",
      weekStart,
    }),
    enabled: Boolean(selectedLocation),
  });
  const schedule = scheduleQuery.data;

  const goTo = (next: { locationId: string; weekStart: string }) => {
    void navigate({ search: { locationId: next.locationId, week: next.weekStart } });
  };

  const invalidateSchedule = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["manager-schedule"] }),
      queryClient.invalidateQueries({ queryKey: ["staff-schedule"] }),
    ]);
  };

  const publish = useMutation({
    mutationFn: () => {
      if (!selectedLocation) throw new Error("No location selected.");
      return publishManagerWeek({ data: { locationId: selectedLocation.id, weekStart } });
    },
    onSuccess: async () => {
      await invalidateSchedule();
      toast.success("Week published. Assigned staff can now see these shifts.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not publish.");
    },
  });

  const unpublish = useMutation({
    mutationFn: () => {
      if (!selectedLocation) throw new Error("No location selected.");
      return unpublishManagerWeek({ data: { locationId: selectedLocation.id, weekStart } });
    },
    onSuccess: async () => {
      await invalidateSchedule();
      toast.success("Week unpublished. Staff can no longer see these shifts.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not unpublish.");
    },
  });

  if (locationsQuery.isSuccess && locations.length === 0) {
    return (
      <p className="text-muted-foreground text-sm" data-test="manager-schedule-empty-locations">
        You are not assigned to any locations yet. An admin needs to assign you before you can
        publish a week.
      </p>
    );
  }

  if (!selectedLocation) {
    return <p className="text-muted-foreground text-sm">Loading locations…</p>;
  }

  const weekEnd = schedule?.weekEnd ?? addDaysYmd(weekStart, 6);
  const published = schedule?.published ?? false;
  const cutoffHours = schedule?.cutoffHours ?? 48;
  const shiftCount = schedule?.days.reduce((total, day) => total + day.shifts.length, 0);

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
            onClick={() => goTo({ locationId: selectedLocation.id, weekStart: addDaysYmd(weekStart, -7) })}
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
            onClick={() => goTo({ locationId: selectedLocation.id, weekStart: addDaysYmd(weekStart, 7) })}
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
      </div>

      {published && schedule && !schedule.canUnpublish ? (
        <p className="text-muted-foreground text-xs">
          Unpublish is locked because a shift starts within {cutoffHours} hours.
        </p>
      ) : null}

      {scheduleQuery.isError ? (
        <p className="text-destructive text-sm">
          {scheduleQuery.error instanceof Error
            ? scheduleQuery.error.message
            : "Could not load this week."}
        </p>
      ) : null}

      {schedule ? <ManagerScheduleWeekBoard days={schedule.days} /> : null}
    </div>
  );
}
