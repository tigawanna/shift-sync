import type { TeamMember } from "@/data-access-layer/team/team.types";
import { useViewer } from "@/data-access-layer/auth/viewer";
import { ROLE, getUserAppRole } from "@/lib/better-auth/roles";
import { formatDate } from "@/utils/date";
import { Link } from "@tanstack/react-router";
import { ImpersonateUserButton } from "./ImpersonateUserButton";

type TeamMembersTableProps = {
  members: TeamMember[];
  emptyMessage: string;
  showImpersonate?: boolean;
  memberTo?: "/admin/users/$userId" | "/manager/team/$userId";
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

export function TeamMembersTable({
  members,
  emptyMessage,
  showImpersonate = false,
  memberTo,
}: TeamMembersTableProps) {
  const { viewer } = useViewer();
  const viewerRole = getUserAppRole(viewer.user);
  const canShowImpersonate =
    showImpersonate && (viewerRole === ROLE.admin || viewerRole === ROLE.manager);

  if (members.length === 0) {
    return (
      <div className="border-base-content/10 bg-base-100/50 rounded-2xl border px-6 py-10 text-center">
        <p className="text-base-content/70 text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="border-base-content/10 overflow-hidden rounded-2xl border">
      <table className="w-full text-left text-sm">
        <thead className="bg-base-300/60 text-base-content/60 text-xs uppercase tracking-wide">
          <tr>
            <th className="px-4 py-3 font-medium">Name</th>
            <th className="px-4 py-3 font-medium">Email</th>
            <th className="px-4 py-3 font-medium">Role</th>
            <th className="px-4 py-3 font-medium">Joined</th>
            {canShowImpersonate ? <th className="px-4 py-3 font-medium">Actions</th> : null}
          </tr>
        </thead>
        <tbody className="divide-base-content/10 divide-y">
          {members.map((member) => (
            <tr key={member.id} className="bg-base-100/70">
              <td className="px-4 py-3 font-medium">
                {memberTo ? (
                  <Link
                    to={memberTo}
                    params={{ userId: member.id }}
                    className="hover:text-primary transition-colors"
                  >
                    {member.name}
                  </Link>
                ) : (
                  member.name
                )}
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
