import { TableCell, TableRow } from "@/components/ui/table";
import { formatDate, formatTimezone } from "@/utils/date";
import type { LocationListItem as LocationListItemData } from "../../-data-access-layer/locations.fn";

type LocationListItemProps = {
  location: LocationListItemData;
};

export function LocationListItem({ location }: LocationListItemProps) {
  return (
    <TableRow data-test="location-list-item">
      <TableCell className="px-4 py-3">
        <div className="font-medium">{location.name}</div>
        {location.address ? (
          <div className="text-muted-foreground mt-0.5 text-xs">{location.address}</div>
        ) : null}
      </TableCell>
      <TableCell className="text-muted-foreground px-4 py-3 font-mono text-xs">
        {formatTimezone(location.timezone)}
      </TableCell>
      <TableCell className="text-muted-foreground px-4 py-3">
        {formatDate(location.createdAt)}
      </TableCell>
    </TableRow>
  );
}
