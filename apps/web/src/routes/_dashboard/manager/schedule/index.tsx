import { accessibleLocationsQueryOptions } from "@/data-access-layer/location/location.queries";
import {
  publishWeek,
  unpublishWeek,
} from "@/data-access-layer/schedule/schedule.functions";
import { weekScheduleQueryOptions } from "@/data-access-layer/schedule/schedule.queries";
import type { WeekShift } from "@/data-access-layer/schedule/schedule.types";
import { AppConfig } from "@/utils/system";
import { addDaysYmd, mondayOfWeekContaining } from "@/lib/time/zoned";
import { RouterPendingComponent } from "@/lib/tanstack/router/RouterPendingComponent";
import { formatTimezone } from "@/utils/date";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { DashboardPageHeader } from "../../-components/DashboardPageHeader";
import { CreateShiftForm } from "../../-components/schedule/CreateShiftForm";
import { EmptyScheduleLocations } from "../../-components/schedule/WeekScheduleBoard";
import { ShiftDetailSheet } from "../../-components/schedule/ShiftDetailSheet";
import { WeekScheduleBoard } from "../../-components/schedule/WeekScheduleBoard";

const scheduleSearchSchema = z.object({
  locationId: z.string().optional(),
  week: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export const Route = createFileRoute("/_dashboard/manager/schedule/")({
  validateSearch: (search) => scheduleSearchSchema.parse(search),
  loaderDeps: ({ search }) => ({ locationId: search.locationId, week: search.week }),
  loader: async ({ context, deps }) => {
    const locations = await context.queryClient.ensureQueryData(accessibleLocationsQueryOptions());
    const locationId = deps.locationId ?? locations[0]?.id;
    if (!locationId) return;
    const timezone = locations.find((location) => location.id === locationId)?.timezone ?? "UTC";
    const weekStart = deps.week ?? mondayOfWeekContaining(new Date(), timezone);
    await context.queryClient.ensureQueryData(
      weekScheduleQueryOptions({ locationId, weekStart }),
    );
  },
  component: ManagerSchedulePage,
  head: () => ({
    meta: [{ title: `${AppConfig.name} | Schedule` }],
  }),
});

function ManagerSchedulePage() {
  return (
    <Suspense fallback={<RouterPendingComponent />}>
      <ManagerScheduleContent />
    </Suspense>
  );
}

function ManagerScheduleContent() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const locationsQuery = useSuspenseQuery(accessibleLocationsQueryOptions());
  const locations = locationsQuery.data;
  const selectedLocation = locations.find((location) => location.id === search.locationId) ?? locations[0];
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

  if (!selectedLocation) {
    return (
      <div className="flex flex-col gap-8">
        <DashboardPageHeader
          title="Schedule"
          description="Build the week, assign coverage, then publish so staff can see their shifts."
        />
        <EmptyScheduleLocations />
      </div>
    );
  }

  return (
    <ManagerScheduleBoard
      locations={locations}
      selectedLocation={selectedLocation}
      weekStart={weekStart}
    />
  );
}

function ManagerScheduleBoard({
  locations,
  selectedLocation,
  weekStart,
}: {
  locations: Array<{ id: string; name: string; timezone: string }>;
  selectedLocation: { id: string; name: string; timezone: string };
  weekStart: string;
}) {
  const navigate = useNavigate({ from: Route.fullPath });
  const qc = useQueryClient();
  const scheduleQuery = useSuspenseQuery(
    weekScheduleQueryOptions({
      locationId: selectedLocation.id,
      weekStart,
    }),
  );

  const [createDate, setCreateDate] = useState<string | null>(null);
  const [selectedShift, setSelectedShift] = useState<WeekShift | null>(null);
  const schedule = scheduleQuery.data;
  const selectedShiftId = selectedShift?.id;
  const liveSelectedShift = selectedShiftId
    ? (schedule.shifts.find((shift) => shift.id === selectedShiftId) ?? null)
    : null;

  const publishMutation = useMutation({
    mutationFn: () => {
      if (!selectedLocation) throw new Error("No location selected.");
      return publishWeek({ data: { locationId: selectedLocation.id, weekStart } });
    },
    onSuccess: () => {
      toast.success("Schedule published. Staff can now see this week.");
      void qc.invalidateQueries({ queryKey: ["schedule"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not publish.");
    },
  });

  const unpublishMutation = useMutation({
    mutationFn: () => {
      if (!selectedLocation) throw new Error("No location selected.");
      return unpublishWeek({ data: { locationId: selectedLocation.id, weekStart } });
    },
    onSuccess: () => {
      toast.success("Schedule unpublished.");
      void qc.invalidateQueries({ queryKey: ["schedule"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not unpublish.");
    },
  });

  const weekEnd = addDaysYmd(weekStart, 6);

  return (
    <div className="flex flex-col gap-8">
      <DashboardPageHeader
        title="Schedule"
        description={`Times are shown in ${formatTimezone(selectedLocation.timezone)}. Draft weeks stay hidden from staff until you publish.`}
        actions={
          schedule.published ? (
            <button
              type="button"
              className="btn btn-outline btn-sm"
              disabled={unpublishMutation.isPending}
              onClick={() => unpublishMutation.mutate()}
            >
              Unpublish
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={publishMutation.isPending}
              onClick={() => publishMutation.mutate()}
            >
              Publish week
            </button>
          )
        }
      />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="select-bordered select select-sm min-w-52"
            value={selectedLocation.id}
            onChange={(event) => {
              void navigate({
                search: { locationId: event.target.value, week: weekStart },
              });
            }}
          >
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>
          <span
            className={`badge badge-sm ${schedule.published ? "badge-success" : "badge-ghost"}`}
          >
            {schedule.published ? "Published" : "Draft"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-square"
            aria-label="Previous week"
            onClick={() =>
              void navigate({
                search: { locationId: selectedLocation.id, week: addDaysYmd(weekStart, -7) },
              })
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
              void navigate({
                search: { locationId: selectedLocation.id, week: addDaysYmd(weekStart, 7) },
              })
            }
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      {createDate ? (
        <div className="border-base-content/10 bg-base-100/70 max-w-lg rounded-2xl border p-6">
          <h2 className="mb-4 text-lg font-semibold tracking-tight">New shift</h2>
          <CreateShiftForm
            locationId={selectedLocation.id}
            defaultDate={createDate}
            onCancel={() => setCreateDate(null)}
            onCreated={() => {
              setCreateDate(null);
              void qc.invalidateQueries({ queryKey: ["schedule"] });
            }}
          />
        </div>
      ) : null}

      <WeekScheduleBoard
        schedule={schedule}
        onSelectShift={setSelectedShift}
        onAddDay={setCreateDate}
      />

      <ShiftDetailSheet
        shift={selectedShiftId ? liveSelectedShift : null}
        onClose={() => setSelectedShift(null)}
      />
    </div>
  );
}
