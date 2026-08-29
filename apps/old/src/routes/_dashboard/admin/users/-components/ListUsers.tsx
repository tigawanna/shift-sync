import { ROLE } from "@/lib/better-auth/roles";
import { ListAdminMembers } from "../../../-components/team/ListAdminMembers";

const ROUTE_ID = "/_dashboard/admin/users/";

export function ListUsers() {
  return (
    <ListAdminMembers
      routeId={ROUTE_ID}
      role={ROLE.staff}
      memberTo="/admin/users/$userId"
      emptyTitle="No staff yet"
      emptyMessage="Use Add staff to create a staff account."
      testId="admin-users-list"
    />
  );
}
