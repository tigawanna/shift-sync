import { ROLE } from "@/lib/better-auth/roles";
import { AppConfig } from "@/utils/system";
import { teamMembersQueryOptions } from "@/data-access-layer/team/team.queries";
import {
  DEFAULT_TEAM_MEMBER_SORT_BY,
  DEFAULT_TEAM_MEMBER_SORT_DIRECTION,
  SORT_DIRECTIONS,
  TEAM_MEMBER_SORT_KEYS,
} from "@/data-access-layer/team/team.types";
import type { TeamMemberRole } from "@/data-access-layer/team/team.types";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CreateTeamUserForm } from "../../-components/team/CreateTeamUserForm";
import { ListUsers } from "./-components/ListUsers";
import { DashboardPageHeader } from "../../-components/DashboardPageHeader";
import { z } from "zod";

const usersSearchSchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  q: z.string().optional(),
  sortBy: z.enum(TEAM_MEMBER_SORT_KEYS).optional(),
  sortDirection: z.enum(SORT_DIRECTIONS).optional(),
});

export const Route = createFileRoute("/_dashboard/admin/users/")({
  validateSearch: (search) => usersSearchSchema.parse(search),
  loaderDeps: ({ search }) => ({
    page: search.page,
    q: search.q,
    sortBy: search.sortBy,
    sortDirection: search.sortDirection,
  }),
  loader: async ({ context, deps }) => {
    await context.queryClient.ensureQueryData(
      teamMembersQueryOptions({
        page: deps.page,
        search: deps.q || undefined,
        sortBy: deps.sortBy ?? DEFAULT_TEAM_MEMBER_SORT_BY,
        sortDirection: deps.sortDirection ?? DEFAULT_TEAM_MEMBER_SORT_DIRECTION,
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
        description="Managers and staff who can be scheduled across Coastal Eats locations."
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

      <ListUsers />
    </div>
  );
}
