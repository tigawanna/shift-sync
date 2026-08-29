import { ROLE } from "@/lib/better-auth/roles";
import { ListAdminMembers } from "../../../-components/team/ListAdminMembers";

const ROUTE_ID = "/_dashboard/admin/managers/";

export function ListManagers() {
  return (
    <ListAdminMembers
      routeId={ROUTE_ID}
      role={ROLE.manager}
      memberTo="/admin/managers/$userId"
      emptyTitle="No managers yet"
      emptyMessage="Use Add manager to create a manager account."
      testId="admin-managers-list"
    />
  );
}
