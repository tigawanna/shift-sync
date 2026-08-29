import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TableCell, TableRow } from "@/components/ui/table";
import { formatDate } from "@/utils/date";
import type { StaffListItem as StaffListItemData } from "../../-data-access-layer/staff.fn";

type StaffListItemProps = {
  staff: StaffListItemData;
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export function StaffListItem({ staff }: StaffListItemProps) {
  return (
    <TableRow data-test="staff-list-item">
      <TableCell className="px-4 py-3">
        <div className="flex items-center gap-3">
          <Avatar size="sm">
            {staff.image ? <AvatarImage src={staff.image} alt="" /> : null}
            <AvatarFallback>{initials(staff.name)}</AvatarFallback>
          </Avatar>
          <span className="font-medium">{staff.name}</span>
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground px-4 py-3">{staff.email}</TableCell>
      <TableCell className="text-muted-foreground px-4 py-3">
        {formatDate(staff.createdAt)}
      </TableCell>
    </TableRow>
  );
}
