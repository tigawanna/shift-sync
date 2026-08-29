import { myStaffProfileQueryOptions } from "@/data-access-layer/staff-profile/staff-profile.queries";
import { RouterPendingComponent } from "@/lib/tanstack/router/RouterPendingComponent";
import { AppConfig } from "@/utils/system";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { DashboardPageHeader } from "../../-components/DashboardPageHeader";
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
    <div className="flex flex-col gap-8">
      <DashboardPageHeader
        title="Availability"
        description="Set the hours you can work. Managers use this when assigning shifts at your certified locations."
      />

      <section className="flex flex-col gap-3" data-test="staff-profile-summary">
        <div>
          <h2 className="text-sm font-medium">Certified locations</h2>
          <p className="text-base-content/60 mt-1 text-sm">
            An admin or manager certifies you for each restaurant. You can work at more than one.
          </p>
        </div>
        {profile.locations.length === 0 ? (
          <p className="text-base-content/50 text-sm">Not certified at a location yet.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {profile.locations.map((location) => (
              <li
                key={location.id}
                className="border-base-content/10 bg-base-100/70 rounded-full border px-3 py-1 text-sm"
              >
                {location.name}
                <span className="text-base-content/50"> · {location.timezone}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-sm font-medium">Skills</h2>
          <p className="text-base-content/60 mt-1 text-sm">
            Your manager assigns these. Shifts only go to people with the required skill.
          </p>
        </div>
        {profile.skills.length === 0 ? (
          <p className="text-base-content/50 text-sm">No skills assigned yet.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {profile.skills.map((skill) => (
              <li
                key={skill.id}
                className={`rounded-md border px-2.5 py-1 text-xs font-medium ${skillAccentClass(skill.id)}`}
              >
                {skill.name}
              </li>
            ))}
          </ul>
        )}
      </section>

      <AvailabilityEditor
        weeklyWindows={profile.weeklyWindows}
        exceptions={profile.exceptions}
      />
    </div>
  );
}
