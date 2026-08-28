import { ROLE } from "@/lib/better-auth/roles";
import { AppConfig } from "@/utils/system";
import { teamMembersQueryOptions } from "@/data-access-layer/team/team.queries";
import type { TeamMemberRole } from "@/data-access-layer/team/team.types";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense, useState } from "react";
import { RouterPendingComponent } from "@/lib/tanstack/router/RouterPendingComponent";
import { CreateTeamUserForm } from "../../-components/team/CreateTeamUserForm";
import { TeamMembersPanel } from "../../-components/team/TeamMembersPanel";
import { DashboardPageHeader } from "../../-components/DashboardPageHeader";
import { z } from "zod";

const usersSearchSchema = z.object({
  page: z.number().optional(),
  q: z.string().optional(),
});

export const Route = createFileRoute("/_dashboard/admin/users/")({
  validateSearch: (search) => usersSearchSchema.parse(search),
  loaderDeps: ({ search }) => ({ page: search.page, q: search.q }),
  loader: async ({ context, deps }) => {
    await context.queryClient.ensureQueryData(
      teamMembersQueryOptions({
        page: deps.page,
        search: deps.q || undefined,
      }),
    );
  },
  component: AdminUsersPage,
  head: () => ({
    meta: [{ title: `${AppConfig.name} | Users` }],
  }),
});

function AdminUsersPage() {
  const qc = useQueryClient();
  const [createRole, setCreateRole] = useState<TeamMemberRole | null>(null);

  function refreshTeam() {
    void qc.invalidateQueries({ queryKey: ["team-members"] });
    setCreateRole(null);
  }

  return (
    <div className="flex flex-col gap-8">
      <DashboardPageHeader
        title="Users"
        description="Managers and staff who can be scheduled. Location assignments will refine this list once locations are configured."
        actions={
          <>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setCreateRole(ROLE.manager)}
            >
              Add manager
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => setCreateRole(ROLE.staff)}
            >
              Add staff
            </button>
          </>
        }
      />

      {createRole ? (
        <CreateTeamUserForm
          role={createRole}
          onCancel={() => setCreateRole(null)}
          onCreated={refreshTeam}
        />
      ) : null}

      <Suspense fallback={<RouterPendingComponent />}>
        <TeamMembersPanel
          routeId="/_dashboard/admin/users/"
          emptyMessage="No managers or staff yet. Use the buttons above to create accounts."
        />
      </Suspense>
    </div>
  );
}
