import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TableCell, TableRow } from "@/components/ui/table";
import { formatDate } from "@/utils/date";
import { initials } from "@/utils/strings";
import { AdminListRowMenu } from "../../-components/AdminListRowMenu";
import { AdminStaffNameLink } from "../../-components/AdminStaffNameLink";
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
          <AdminStaffNameLink staffId={staff.id} name={staff.name} />
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground px-4 py-3">{staff.email}</TableCell>
      <TableCell className="text-muted-foreground px-4 py-3">
        {formatDate(staff.createdAt)}
      </TableCell>
      <TableCell className="px-4 py-3">
        <AdminListRowMenu
          label={`Actions for ${staff.name}`}
          impersonate={staff}
          actions={[{ label: "Skills & certs", onSelect: onEditDirectory }]}
        />
      </TableCell>
    </TableRow>
  );
}
