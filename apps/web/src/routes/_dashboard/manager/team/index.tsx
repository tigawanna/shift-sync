import { AppConfig } from "@/utils/system";
import { teamMembersQueryOptions } from "@/data-access-layer/team/team.queries";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { RouterPendingComponent } from "@/lib/tanstack/router/RouterPendingComponent";
import { TeamMembersPanel } from "../../-components/team/TeamMembersPanel";
import { DashboardPageHeader } from "../../-components/DashboardPageHeader";
import { z } from "zod";

const teamSearchSchema = z.object({
  page: z.number().optional(),
  q: z.string().optional(),
});

export const Route = createFileRoute("/_dashboard/manager/team/")({
  validateSearch: (search) => teamSearchSchema.parse(search),
  loaderDeps: ({ search }) => ({ page: search.page, q: search.q }),
  loader: async ({ context, deps }) => {
    await context.queryClient.ensureQueryData(
      teamMembersQueryOptions({
        page: deps.page,
        search: deps.q || undefined,
      }),
    );
  },
  component: ManagerTeamPage,
  head: () => ({
    meta: [{ title: `${AppConfig.name} | Team` }],
  }),
});

function ManagerTeamPage() {
  return (
    <div className="flex flex-col gap-8">
      <DashboardPageHeader
        title="Your team"
        description="Staff members available for shift assignments."
      />

      <Suspense fallback={<RouterPendingComponent />}>
        <TeamMembersPanel
          routeId="/_dashboard/manager/team/"
          emptyMessage="No staff accounts yet. Ask an admin to create staff users."
        />
      </Suspense>
    </div>
  );
}
