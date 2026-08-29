import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TableCell, TableRow } from "@/components/ui/table";
import { formatDate } from "@/utils/date";
import { initials } from "@/utils/strings";
import type { AdminListItem as AdminListItemData } from "../../-data-access-layer/admins.fn";

type AdminListItemProps = {
  admin: AdminListItemData;
};

export function AdminListItem({ admin }: AdminListItemProps) {
  return (
    <TableRow data-test="admin-list-item">
      <TableCell className="px-4 py-3">
        <div className="flex items-center gap-3">
          <Avatar size="sm">
            {admin.image ? <AvatarImage src={admin.image} alt="" /> : null}
            <AvatarFallback>{initials(admin.name)}</AvatarFallback>
          </Avatar>
          <span className="font-medium">{admin.name}</span>
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground px-4 py-3">{admin.email}</TableCell>
      <TableCell className="text-muted-foreground px-4 py-3">
        {formatDate(admin.createdAt)}
      </TableCell>
    </TableRow>
  );
}
