import { managerShiftAuditQueryOptions } from "../../-data-access-layer/manager-schedule.query-options";
import { useQuery } from "@tanstack/react-query";

export function ShiftHistory({ shiftId }: { shiftId: string }) {
  const query = useQuery(managerShiftAuditQueryOptions(shiftId));

  if (query.isPending) {
    return <p className="text-muted-foreground text-sm">Loading history…</p>;
  }

  if (query.isError) {
    return (
      <p className="text-destructive text-sm">
        {query.error instanceof Error ? query.error.message : "Could not load history."}
      </p>
    );
  }

  const items = query.data.items;

  return (
    <section className="flex flex-col gap-2" data-test="shift-history">
      <h3 className="text-sm font-semibold">Change history</h3>
      {items.length === 0 ? (
        <p className="text-muted-foreground text-xs">No recorded changes yet.</p>
      ) : (
        <ul className="divide-border divide-y rounded-xl border">
          {items.map((item) => (
            <li key={item.id} className="flex flex-col gap-0.5 px-3 py-2">
              <p className="text-sm">
                {item.action} <span className="text-muted-foreground">· {item.actorName}</span>
              </p>
              <p className="text-muted-foreground text-xs tabular-nums">
                {new Date(item.createdAt).toISOString()}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
