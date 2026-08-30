import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";

export function AdminManagerNameLink({
  managerId,
  name,
  className,
}: {
  managerId: string;
  name: string;
  className?: string;
}) {
  return (
    <Link
      to="/admin/managers/$managerId"
      params={{ managerId }}
      className={cn("font-medium underline-offset-4 hover:underline", className)}
    >
      {name}
    </Link>
  );
}
