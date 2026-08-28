import { queryOptions } from "@tanstack/react-query";
import { listTeamMembers } from "./team.functions";
import type { ListTeamMembersInput } from "./team.types";

export function teamMembersQueryOptions(input: ListTeamMembersInput = {}) {
  return queryOptions({
    queryKey: ["team-members", input.page ?? 1, input.search ?? ""],
    queryFn: () => listTeamMembers({ data: input }),
  });
}
