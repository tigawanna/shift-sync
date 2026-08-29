import { queryOptions } from "@tanstack/react-query";
import { getTeamMember, listTeamMembers } from "./team.functions";
import {
  DEFAULT_TEAM_MEMBER_SORT_BY,
  DEFAULT_TEAM_MEMBER_SORT_DIRECTION,
  type GetTeamMemberInput,
  type ListTeamMembersInput,
} from "./team.types";

/** Paginated directory of managers and/or staff the current viewer is allowed to see. */
export function teamMembersQueryOptions(input: ListTeamMembersInput = {}) {
  return queryOptions({
    queryKey: [
      "team-members",
      input.page ?? 1,
      input.search ?? "",
      input.role ?? "",
      input.sortBy ?? DEFAULT_TEAM_MEMBER_SORT_BY,
      input.sortDirection ?? DEFAULT_TEAM_MEMBER_SORT_DIRECTION,
    ],
    queryFn: () => listTeamMembers({ data: input }),
  });
}

/** One person plus their location assignments, optionally constrained to a role. */
export function teamMemberQueryOptions(input: GetTeamMemberInput) {
  return queryOptions({
    queryKey: ["team-member", input.userId, input.role ?? ""],
    queryFn: () => getTeamMember({ data: input }),
  });
}
