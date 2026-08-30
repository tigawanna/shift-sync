import { queryOptions } from "@tanstack/react-query";
import { listAdminAudit, type ListAdminAuditInput } from "./admin-audit.fn";

export function listAdminAuditQueryOptions(input: ListAdminAuditInput) {
  return queryOptions({
    queryKey: ["admin-audit", input],
    queryFn: () => listAdminAudit({ data: input }),
  });
}
