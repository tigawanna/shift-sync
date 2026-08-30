import { TableCell, TableRow } from "@/components/ui/table";
import { formatTimezone } from "@/utils/date";
import { Link } from "@tanstack/react-router";
import type { ManagerScheduleListItem } from "../../-data-access-layer/manager-schedule.fn";

export function ScheduleListItem({ item }: { item: ManagerScheduleListItem }) {
  return (
    <TableRow data-test="schedule-list-item" className="relative">
      <TableCell className="px-4 py-3">
        <Link
          to="/manager/schedule/$locationId/$weekStart"
          params={{ locationId: item.locationId, weekStart: item.weekStart }}
          className="font-medium after:absolute after:inset-0"
        >
          {item.locationName}
        </Link>
      </TableCell>
      <TableCell className="px-4 py-3 font-mono text-xs tabular-nums">
        {item.weekStart} – {item.weekEnd}
      </TableCell>
      <TableCell className="px-4 py-3">
        <span className={`badge badge-sm ${item.published ? "badge-success" : "badge-ghost"}`}>
          {item.published ? "Published" : "Draft"}
        </span>
      </TableCell>
      <TableCell className="text-muted-foreground px-4 py-3 tabular-nums">
        {item.shiftCount}
      </TableCell>
      <TableCell className="text-muted-foreground px-4 py-3 font-mono text-xs">
        {formatTimezone(item.timezone)}
      </TableCell>
    </TableRow>
  );
}
