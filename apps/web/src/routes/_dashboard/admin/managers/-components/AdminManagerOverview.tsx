import { ADMIN_LIST_PER_PAGE } from "@/components/pagination/constants";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { defaultWeekStartYmd } from "@/lib/schedule/oversight";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { CalendarDays, ChevronRight, MapPin, Users } from "lucide-react";
import { adminManagerHomeQueryOptions } from "../../-data-access-layer/managers.query-options";

export function AdminManagerOverview({ managerId }: { managerId: string }) {
  const { data } = useSuspenseQuery(adminManagerHomeQueryOptions(managerId));
  const soleLocationId = data.locations.length === 1 ? data.locations[0]?.id : undefined;
  const weekStart = defaultWeekStartYmd();

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2" data-test="admin-manager-home-counts">
        <Link
          to="/admin/staff"
          search={{
            page: 1,
            perPage: ADMIN_LIST_PER_PAGE,
            sq: "",
            locationId: soleLocationId,
          }}
          className="rounded-xl"
        >
          <Card className="hover:bg-muted/40 h-full transition-colors">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Users className="text-muted-foreground size-4" />
                <CardDescription>Staff</CardDescription>
              </div>
              <CardTitle className="font-heading text-3xl tabular-nums">
                {data.staffCount}
              </CardTitle>
              <CardDescription>
                Certified at this manager’s locations. Open the staff list.
              </CardDescription>
              <CardAction>
                <ChevronRight className="text-muted-foreground size-5" aria-hidden />
              </CardAction>
            </CardHeader>
          </Card>
        </Link>
        <Link
          to="/admin/schedules"
          search={{ weekStart, locationId: soleLocationId }}
          className="rounded-xl"
        >
          <Card className="hover:bg-muted/40 h-full transition-colors">
            <CardHeader>
              <div className="flex items-center gap-2">
                <MapPin className="text-muted-foreground size-4" />
                <CardDescription>Locations</CardDescription>
              </div>
              <CardTitle className="font-heading text-3xl tabular-nums">
                {data.locationCount}
              </CardTitle>
              <CardDescription>Restaurants they run. Open the schedule.</CardDescription>
              <CardAction>
                <ChevronRight className="text-muted-foreground size-5" aria-hidden />
              </CardAction>
            </CardHeader>
          </Card>
        </Link>
      </div>

      {data.locations.length > 1 ? (
        <ul className="flex flex-wrap gap-2" data-test="admin-manager-locations">
          {data.locations.map((location) => (
            <li key={location.id}>
              <Link
                to="/admin/schedules"
                search={{ weekStart, locationId: location.id }}
                className="hover:bg-muted/40 inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm"
              >
                {location.name}
                <ChevronRight className="text-muted-foreground size-3.5" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      <Card data-test="admin-manager-on-duty-widget">
        <CardHeader className="border-b">
          <Link
            to="/admin/schedules/on-duty"
            search={{
              page: 1,
              perPage: ADMIN_LIST_PER_PAGE,
              sq: "",
              locationId: soleLocationId,
            }}
            className="hover:bg-muted/40 -m-2 flex items-start justify-between gap-3 rounded-lg p-2 transition-colors"
          >
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <CalendarDays className="text-muted-foreground size-4" />
                <CardTitle>Shifts</CardTitle>
              </div>
              <CardDescription>
                {data.overseeingCount} {data.overseeingCount === 1 ? "assignment" : "assignments"}{" "}
                still to oversee · {data.onDutyTotal} on duty now
              </CardDescription>
            </div>
            <span className="text-muted-foreground inline-flex items-center gap-1 text-sm whitespace-nowrap">
              Open schedule
              <ChevronRight className="size-4" aria-hidden />
            </span>
          </Link>
        </CardHeader>
        <CardContent>
          {data.onDuty.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nobody is on a shift right now.</p>
          ) : (
            <ul className="divide-border divide-y">
              {data.onDuty.map((item) => (
                <li key={item.assignmentId}>
                  <Link
                    to="/admin/staff/$staffId"
                    params={{ staffId: item.userId }}
                    search={{ month: item.date.slice(0, 7) }}
                    className="hover:bg-muted/40 -mx-2 flex items-center gap-2 rounded-lg px-2 py-2.5"
                  >
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between">
                      <p className="text-sm">
                        {item.userName}{" "}
                        <span className="text-muted-foreground">· {item.skillName}</span>
                      </p>
                      <p className="text-muted-foreground text-xs tabular-nums">
                        {item.locationName} · {item.startTime}–{item.endTime}
                      </p>
                    </div>
                    <ChevronRight className="text-muted-foreground size-4 shrink-0" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {data.onDutyTotal > data.onDuty.length ? (
            <p className="text-muted-foreground mt-2 text-xs">
              Showing {data.onDuty.length} of {data.onDutyTotal} on duty. Open the schedule for
              every week.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
