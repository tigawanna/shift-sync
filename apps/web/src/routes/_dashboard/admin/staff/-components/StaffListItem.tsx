import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TableCell, TableRow } from "@/components/ui/table";
import { formatDate } from "@/utils/date";
import { initials } from "@/utils/strings";
import { ImpersonateUserButton } from "../../../-components/ImpersonateUserButton";
import type { StaffListItem as StaffListItemData } from "../../-data-access-layer/staff.fn";

type StaffListItemProps = {
  staff: StaffListItemData;
  onEditDirectory: () => void;
};

export function StaffListItem({ staff, onEditDirectory }: StaffListItemProps) {
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
      <TableCell className="px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="btn btn-ghost btn-xs" onClick={onEditDirectory}>
            Skills & certs
          </button>
          <ImpersonateUserButton user={staff} />
        </div>
      </TableCell>
    </TableRow>
  );
}
