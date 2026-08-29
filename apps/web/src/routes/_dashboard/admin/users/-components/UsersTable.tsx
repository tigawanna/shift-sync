import type { TeamMember } from "@/data-access-layer/team/team.types";
import type { SortDirection, TeamMemberSortBy } from "@/data-access-layer/team/team.types";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { useViewer } from "@/data-access-layer/auth/viewer";
import { ROLE, getUserAppRole } from "@/lib/better-auth/roles";
import { formatDate } from "@/utils/date";
import { Link } from "@tanstack/react-router";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { ImpersonateUserButton } from "../../../-components/team/ImpersonateUserButton";
import type { DashboardPersonTo } from "../../../-components/team/person-routes";

type UsersTableProps = {
  data: TeamMember[] | undefined;
  isLoading?: boolean;
  emptyTitle?: string;
  emptyMessage?: string;
  memberTo?: DashboardPersonTo;
  showRole?: boolean;
  showImpersonate?: boolean;
  sortBy: TeamMemberSortBy;
  sortDirection: SortDirection;
  onSort: (column: TeamMemberSortBy) => void;
};

function roleBadgeClass(role: TeamMember["role"]) {
  if (role === ROLE.manager) {
    return "bg-flag-blue-soft text-flag-blue";
  }
  if (role === ROLE.admin) {
    return "bg-flag-green-solid text-flag-green-content";
  }
  return "bg-base-content/8 text-base-content/70";
}

function roleLabel(role: TeamMember["role"]) {
  if (role === ROLE.manager) return "Manager";
  if (role === ROLE.admin) return "Admin";
  return "Staff";
}

function SortableHeader({
  label,
  column,
  sortBy,
  sortDirection,
  onSort,
}: {
  label: string;
  column: TeamMemberSortBy;
  sortBy: TeamMemberSortBy;
  sortDirection: SortDirection;
  onSort: (column: TeamMemberSortBy) => void;
}) {
  const active = sortBy === column;
  const SortIcon = active ? (sortDirection === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;

  return (
    <th className="px-4 py-3 font-medium">
      <button
        type="button"
        className="hover:text-base-content inline-flex items-center gap-1 transition-colors"
        onClick={() => onSort(column)}
        aria-sort={active ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}
      >
        {label}
        <SortIcon className={`size-3.5 ${active ? "text-base-content" : "opacity-40"}`} />
      </button>
    </th>
  );
}

export function UsersTable({
  data,
  isLoading = false,
  emptyTitle = "No users yet",
  emptyMessage = "No managers or staff yet. Use the buttons above to create accounts.",
  memberTo = "/admin/users/$userId",
  showRole = true,
  showImpersonate = false,
  sortBy,
  sortDirection,
  onSort,
}: UsersTableProps) {
  const { viewer } = useViewer();
  const viewerRole = getUserAppRole(viewer.user);
  const canShowImpersonate =
    showImpersonate && (viewerRole === ROLE.admin || viewerRole === ROLE.manager);

  if (isLoading) {
    return <UsersTableSkeleton showRole={showRole} showImpersonate={canShowImpersonate} />;
  }

  if (!data || data.length === 0) {
    return (
      <Empty data-test="users-empty">
        <EmptyHeader>
          <EmptyTitle>{emptyTitle}</EmptyTitle>
          <EmptyDescription>{emptyMessage}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div
      className="border-base-content/10 overflow-hidden rounded-2xl border"
      data-test="users-table"
    >
      <table className="w-full text-left text-sm">
        <thead className="bg-base-300/60 text-base-content/60 text-xs uppercase tracking-wide">
          <tr>
            <SortableHeader
              label="Name"
              column="name"
              sortBy={sortBy}
              sortDirection={sortDirection}
              onSort={onSort}
            />
            <SortableHeader
              label="Email"
              column="email"
              sortBy={sortBy}
              sortDirection={sortDirection}
              onSort={onSort}
            />
            {showRole ? (
              <SortableHeader
                label="Role"
                column="role"
                sortBy={sortBy}
                sortDirection={sortDirection}
                onSort={onSort}
              />
            ) : null}
            <SortableHeader
              label="Joined"
              column="createdAt"
              sortBy={sortBy}
              sortDirection={sortDirection}
              onSort={onSort}
            />
            {canShowImpersonate ? (
              <th className="px-4 py-3 font-medium">Actions</th>
            ) : null}
          </tr>
        </thead>
        <tbody className="divide-base-content/10 divide-y">
          {data.map((member) => (
            <tr key={member.id} className="bg-base-100/70 hover:bg-base-200/40 transition-colors">
              <td className="px-4 py-3 font-medium">
                <Link
                  to={memberTo}
                  params={{ userId: member.id }}
                  className="hover:text-primary transition-colors"
                >
                  {member.name}
                </Link>
              </td>
              <td className="text-base-content/70 px-4 py-3">{member.email}</td>
              {showRole ? (
                <td className="px-4 py-3">
                  <span
                    className={`rounded-md px-2.5 py-1 text-xs font-medium ${roleBadgeClass(member.role)}`}
                  >
                    {roleLabel(member.role)}
                  </span>
                </td>
              ) : null}
              <td className="text-base-content/70 px-4 py-3">{formatDate(member.createdAt)}</td>
              {canShowImpersonate ? (
                <td className="px-4 py-3">
                  <ImpersonateUserButton
                    member={member}
                    viewerRole={viewerRole as typeof ROLE.admin | typeof ROLE.manager}
                  />
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function UsersTableSkeleton({
  showRole,
  showImpersonate,
}: {
  showRole: boolean;
  showImpersonate: boolean;
}) {
  return (
    <div className="border-base-content/10 overflow-hidden rounded-2xl border">
      <table className="w-full text-left text-sm">
        <thead className="bg-base-300/60 text-base-content/60 text-xs uppercase tracking-wide">
          <tr>
            <th className="px-4 py-3 font-medium">Name</th>
            <th className="px-4 py-3 font-medium">Email</th>
            {showRole ? <th className="px-4 py-3 font-medium">Role</th> : null}
            <th className="px-4 py-3 font-medium">Joined</th>
            {showImpersonate ? <th className="px-4 py-3 font-medium">Actions</th> : null}
          </tr>
        </thead>
        <tbody className="divide-base-content/10 divide-y">
          {Array.from({ length: 6 }).map((_, index) => (
            <tr key={index} className="bg-base-100/70">
              <td className="px-4 py-3">
                <Skeleton className="h-4 w-32" />
              </td>
              <td className="px-4 py-3">
                <Skeleton className="h-4 w-44" />
              </td>
              {showRole ? (
                <td className="px-4 py-3">
                  <Skeleton className="h-6 w-16 rounded-md" />
                </td>
              ) : null}
              <td className="px-4 py-3">
                <Skeleton className="h-4 w-24" />
              </td>
              {showImpersonate ? (
                <td className="px-4 py-3">
                  <Skeleton className="h-6 w-20" />
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
