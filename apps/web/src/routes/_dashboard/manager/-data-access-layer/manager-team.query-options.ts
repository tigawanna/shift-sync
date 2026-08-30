import { queryOptions } from "@tanstack/react-query";
import { listManagerTeam, type ListManagerTeamInput } from "./manager-team.fn";

export function listManagerTeamQueryOptions(input: ListManagerTeamInput) {
  const page = input.page;
  const perPage = input.perPage;
  const sq = input.sq?.trim();
  const locationId = input.locationId;

  return queryOptions({
    queryKey: ["manager-team", page, perPage, sq, locationId],
    queryFn: () => listManagerTeam({ data: { page, perPage, sq, locationId } }),
  });
}
