import { ROLE } from "@/lib/better-auth/roles";
import { AppConfig } from "@/utils/system";
import { teamMembersQueryOptions } from "@/data-access-layer/team/team.queries";
import {
  DEFAULT_TEAM_MEMBER_SORT_BY,
  DEFAULT_TEAM_MEMBER_SORT_DIRECTION,
  SORT_DIRECTIONS,
  TEAM_MEMBER_SORT_KEYS,
} from "@/data-access-layer/team/team.types";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CreateTeamUserForm } from "../../-components/team/CreateTeamUserForm";
import { DashboardPageHeader } from "../../-components/DashboardPageHeader";
import { ListManagers } from "./-components/ListManagers";
import { z } from "zod";

const managersSearchSchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  q: z.string().optional(),
  sortBy: z.enum(TEAM_MEMBER_SORT_KEYS).optional(),
  sortDirection: z.enum(SORT_DIRECTIONS).optional(),
});

export const Route = createFileRoute("/_dashboard/admin/managers/")({
  validateSearch: (search) => managersSearchSchema.parse(search),
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
        role: ROLE.manager,
        sortBy: deps.sortBy ?? DEFAULT_TEAM_MEMBER_SORT_BY,
        sortDirection: deps.sortDirection ?? DEFAULT_TEAM_MEMBER_SORT_DIRECTION,
      }),
    );
  },
  component: AdminManagersPage,
  head: () => ({
    meta: [{ title: `${AppConfig.name} | Managers` }],
  }),
});

function AdminManagersPage() {
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);

  function refreshTeam() {
    void qc.invalidateQueries({ queryKey: ["team-members"] });
    setCreating(false);
  }

  return (
    <div className="flex flex-col gap-8">
      <DashboardPageHeader
        title="Managers"
        description="Location managers you oversee. Assign them restaurants, then they schedule their staff."
        actions={
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => setCreating(true)}
          >
            Add manager
          </button>
        }
      />

      {creating ? (
        <CreateTeamUserForm
          role={ROLE.manager}
          onCancel={() => setCreating(false)}
          onCreated={refreshTeam}
        />
      ) : null}

      <ListManagers />
    </div>
  );
}
