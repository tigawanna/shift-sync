import { myScheduleQueryOptions } from "@/data-access-layer/schedule/schedule.queries";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { ROLE, getHomePathForRole, getUserAppRole } from "@/lib/better-auth/roles";
import { addDaysYmd, formatWeekdayYmd, mondayOfWeekContaining } from "@/lib/time/zoned";
import { RouterPendingComponent } from "@/lib/tanstack/router/RouterPendingComponent";
import { formatTimezone } from "@/utils/date";
import { AppConfig } from "@/utils/system";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Suspense } from "react";
import { z } from "zod";
import { DashboardPageHeader } from "../-components/DashboardPageHeader";
import { coverageLabel, shiftTimeLabel, skillAccentClass } from "../-components/schedule/shift-display";

const staffSearchSchema = z.object({
  week: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export const Route = createFileRoute("/_dashboard/staff/")({
  validateSearch: (search) => staffSearchSchema.parse(search),
  beforeLoad: ({ context }) => {
    const role = getUserAppRole(context.viewer?.user);
    if (role !== ROLE.staff && role !== ROLE.admin) {
      throw redirect({ to: getHomePathForRole(role) });
    }
  },
  loaderDeps: ({ search }) => ({ week: search.week }),
  loader: async ({ context, deps }) => {
    const weekStart = deps.week ?? mondayOfWeekContaining(new Date(), "UTC");
    await context.queryClient.ensureQueryData(myScheduleQueryOptions({ weekStart }));
  },
  component: StaffSchedulePage,
  head: () => ({
    meta: [{ title: `${AppConfig.name} | My schedule` }],
  }),
});

function StaffSchedulePage() {
  return (
    <Suspense fallback={<RouterPendingComponent />}>
      <StaffScheduleContent />
    </Suspense>
  );
}

function StaffScheduleContent() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const weekStart = search.week ?? mondayOfWeekContaining(new Date(), "UTC");
  const scheduleQuery = useSuspenseQuery(myScheduleQueryOptions({ weekStart }));
  const weekEnd = addDaysYmd(weekStart, 6);
  const days = Array.from({ length: 7 }, (_, index) => addDaysYmd(weekStart, index));

  return (
    <div className="flex flex-col gap-8">
      <DashboardPageHeader
        title="My schedule"
        description="Published shifts at your certified locations. Each shift is shown in that restaurant's timezone."
      />

      <div className="flex items-center justify-center gap-2 sm:justify-start">
        <button
          type="button"
          className="btn btn-ghost btn-sm btn-square"
          aria-label="Previous week"
          onClick={() => void navigate({ search: { week: addDaysYmd(weekStart, -7) } })}
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
          onClick={() => void navigate({ search: { week: addDaysYmd(weekStart, 7) } })}
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      {scheduleQuery.data.shifts.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No published shifts this week</EmptyTitle>
            <EmptyDescription>
              When a manager publishes the schedule, your assignments will show up here.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="flex flex-col gap-4">
          {days.map((ymd) => {
            const dayShifts = scheduleQuery.data.shifts.filter((shift) => shift.startDate === ymd);
            if (dayShifts.length === 0) return null;
            return (
              <section key={ymd} className="flex flex-col gap-2">
                <h2 className="text-sm font-medium">
                  {formatWeekdayYmd(ymd)}{" "}
                  <span className="text-base-content/55 font-normal tabular-nums">{ymd}</span>
                </h2>
                <ul className="flex flex-col gap-2">
                  {dayShifts.map((shift) => (
                    <li
                      key={shift.id}
                      className={`rounded-2xl border px-4 py-3 ${skillAccentClass(shift.skillId)}`}
                    >
                      <p className="font-medium">{shift.skillName}</p>
                      <p className="text-sm opacity-80">{shiftTimeLabel(shift)}</p>
                      <p className="mt-1 text-xs opacity-70">
                        {shift.locationName} · {formatTimezone(shift.timezone)} · team{" "}
                        {coverageLabel(shift)}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
