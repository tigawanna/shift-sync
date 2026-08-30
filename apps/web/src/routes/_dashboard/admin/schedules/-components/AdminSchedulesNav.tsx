import { Link } from "@tanstack/react-router";

const links = [
  { to: "/admin/schedules", label: "Overtime and fairness", exact: true },
  { to: "/admin/schedules/who", label: "Who's working", exact: false },
  { to: "/admin/schedules/on-duty", label: "On duty", exact: false },
] as const;

export function AdminSchedulesNav() {
  return (
    <nav className="flex flex-wrap gap-1" data-test="admin-schedules-nav">
      {links.map((link) => (
        <Link
          key={link.to}
          to={link.to}
          activeOptions={{ exact: link.exact }}
          className="btn btn-ghost btn-sm data-[status=active]:bg-primary/40"
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
