import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TableCell, TableRow } from "@/components/ui/table";
import { formatDate } from "@/utils/date";
import { initials } from "@/utils/strings";
import { AdminListRowMenu } from "../../-components/AdminListRowMenu";
import type { ManagerListItem as ManagerListItemData } from "../../-data-access-layer/managers.fn";

type ManagerListItemProps = {
  manager: ManagerListItemData;
  onEditLocations: () => void;
};

export function ManagerListItem({ manager, onEditLocations }: ManagerListItemProps) {
  return (
    <TableRow data-test="manager-list-item">
      <TableCell className="px-4 py-3">
        <div className="flex items-center gap-3">
          <Avatar size="sm">
            {manager.image ? <AvatarImage src={manager.image} alt="" /> : null}
            <AvatarFallback>{initials(manager.name)}</AvatarFallback>
          </Avatar>
          <span className="font-medium">{manager.name}</span>
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground px-4 py-3">{manager.email}</TableCell>
      <TableCell className="text-muted-foreground px-4 py-3">
        {formatDate(manager.createdAt)}
      </TableCell>
      <TableCell className="px-4 py-3">
        <AdminListRowMenu
          label={`Actions for ${manager.name}`}
          impersonate={manager}
          actions={[{ label: "Locations", onSelect: onEditLocations }]}
        />
      </TableCell>
    </TableRow>
  );
}
