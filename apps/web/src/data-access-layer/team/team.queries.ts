import { queryOptions } from "@tanstack/react-query";
import { listTeamMembers } from "./team.functions";
import {
  DEFAULT_TEAM_MEMBER_SORT_BY,
  DEFAULT_TEAM_MEMBER_SORT_DIRECTION,
  type ListTeamMembersInput,
} from "./team.types";

export function teamMembersQueryOptions(input: ListTeamMembersInput = {}) {
  return queryOptions({
    queryKey: [
      "team-members",
      input.page ?? 1,
      input.search ?? "",
      input.sortBy ?? DEFAULT_TEAM_MEMBER_SORT_BY,
      input.sortDirection ?? DEFAULT_TEAM_MEMBER_SORT_DIRECTION,
    ],
    queryFn: () => listTeamMembers({ data: input }),
  });
}
