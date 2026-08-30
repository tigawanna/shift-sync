import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TableCell, TableRow } from "@/components/ui/table";
import { initials } from "@/utils/strings";
import type { listManagerTeam } from "../../-data-access-layer/manager-team.fn";

type TeamPerson = Awaited<ReturnType<typeof listManagerTeam>>["items"][number];

export function TeamListItem({ person }: { person: TeamPerson }) {
  return (
    <TableRow data-test="manager-team-item">
      <TableCell className="px-4 py-3">
        <div className="flex items-center gap-3">
          <Avatar size="sm">
            {person.image ? <AvatarImage src={person.image} alt="" /> : null}
            <AvatarFallback>{initials(person.name)}</AvatarFallback>
          </Avatar>
          <span className="font-medium">{person.name}</span>
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground px-4 py-3">{person.email}</TableCell>
      <TableCell className="text-muted-foreground px-4 py-3">
        {person.skills.length > 0 ? person.skills.join(", ") : "—"}
      </TableCell>
      <TableCell className="text-muted-foreground px-4 py-3">
        {person.locations.length > 0 ? person.locations.join(", ") : "—"}
      </TableCell>
    </TableRow>
  );
}
