import type { TeamMember } from "@/data-access-layer/team/team.types";
import type { SortDirection, TeamMemberSortBy } from "@/data-access-layer/team/team.types";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { ROLE } from "@/lib/better-auth/roles";
import { formatDate } from "@/utils/date";
import { Link } from "@tanstack/react-router";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

type UsersTableProps = {
  data: TeamMember[] | undefined;
  isLoading?: boolean;
  emptyMessage?: string;
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
  emptyMessage = "No managers or staff yet. Use the buttons above to create accounts.",
  sortBy,
  sortDirection,
  onSort,
}: UsersTableProps) {
  if (isLoading) {
    return <UsersTableSkeleton />;
  }

  if (!data || data.length === 0) {
    return (
      <Empty data-test="users-empty">
        <EmptyHeader>
          <EmptyTitle>No users yet</EmptyTitle>
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
            <SortableHeader
              label="Role"
              column="role"
              sortBy={sortBy}
              sortDirection={sortDirection}
              onSort={onSort}
            />
            <SortableHeader
              label="Joined"
              column="createdAt"
              sortBy={sortBy}
              sortDirection={sortDirection}
              onSort={onSort}
            />
          </tr>
        </thead>
        <tbody className="divide-base-content/10 divide-y">
          {data.map((member) => (
            <tr key={member.id} className="bg-base-100/70 hover:bg-base-200/40 transition-colors">
              <td className="px-4 py-3 font-medium">
                <Link
                  to="/admin/users/$userId"
                  params={{ userId: member.id }}
                  className="hover:text-primary transition-colors"
                >
                  {member.name}
                </Link>
              </td>
              <td className="text-base-content/70 px-4 py-3">{member.email}</td>
              <td className="px-4 py-3">
                <span
                  className={`rounded-md px-2.5 py-1 text-xs font-medium ${roleBadgeClass(member.role)}`}
                >
                  {roleLabel(member.role)}
                </span>
              </td>
              <td className="text-base-content/70 px-4 py-3">{formatDate(member.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function UsersTableSkeleton() {
  return (
    <div className="border-base-content/10 overflow-hidden rounded-2xl border">
      <table className="w-full text-left text-sm">
        <thead className="bg-base-300/60 text-base-content/60 text-xs uppercase tracking-wide">
          <tr>
            <th className="px-4 py-3 font-medium">Name</th>
            <th className="px-4 py-3 font-medium">Email</th>
            <th className="px-4 py-3 font-medium">Role</th>
            <th className="px-4 py-3 font-medium">Joined</th>
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
              <td className="px-4 py-3">
                <Skeleton className="h-6 w-16 rounded-md" />
              </td>
              <td className="px-4 py-3">
                <Skeleton className="h-4 w-24" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
