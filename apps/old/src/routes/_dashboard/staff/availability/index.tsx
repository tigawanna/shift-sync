import { myStaffProfileQueryOptions } from "@/data-access-layer/staff-profile/staff-profile.queries";
import { RouterPendingComponent } from "@/lib/tanstack/router/RouterPendingComponent";
import { AppConfig } from "@/utils/system";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { AvailabilityEditor } from "../../-components/availability/AvailabilityEditor";
import { skillAccentClass } from "../../-components/schedule/shift-display";

export const Route = createFileRoute("/_dashboard/staff/availability/")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(myStaffProfileQueryOptions());
  },
  component: StaffAvailabilityPage,
  head: () => ({
    meta: [{ title: `${AppConfig.name} | Availability` }],
  }),
});

function StaffAvailabilityPage() {
  return (
    <Suspense fallback={<RouterPendingComponent />}>
      <StaffAvailabilityContent />
    </Suspense>
  );
}

function StaffAvailabilityContent() {
  const profileQuery = useSuspenseQuery(myStaffProfileQueryOptions());
  const profile = profileQuery.data;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Availability</h1>
        <div
          className="flex flex-wrap items-center gap-x-3 gap-y-1.5"
          data-test="staff-profile-summary"
        >
          <span className="sr-only">Certified locations</span>
          {profile.locations.length === 0 ? (
            <p className="text-base-content/50 text-sm">No locations</p>
          ) : (
            <ul className="flex flex-wrap items-center gap-1.5">
              {profile.locations.map((location) => (
                <li key={location.id} className="text-sm">
                  {location.name}
                  <span className="text-base-content/50"> · {location.timezone}</span>
                </li>
              ))}
            </ul>
          )}
          <span className="text-base-content/20" aria-hidden>
            ·
          </span>
          <span className="sr-only">Skills</span>
          {profile.skills.length === 0 ? (
            <p className="text-base-content/50 text-sm">No skills</p>
          ) : (
            <ul className="flex flex-wrap items-center gap-1.5">
              {profile.skills.map((skill) => (
                <li
                  key={skill.id}
                  className={`rounded-md border px-2 py-0.5 text-xs font-medium ${skillAccentClass(skill.id)}`}
                >
                  {skill.name}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <AvailabilityEditor
        weeklyWindows={profile.weeklyWindows}
        exceptions={profile.exceptions}
      />
    </div>
  );
}
