import type { OnDutyNowResult } from "@/lib/schedule/oversight";
import type { UseQueryResult } from "@tanstack/react-query";

export function OnDutyNow({ query }: { query: UseQueryResult<OnDutyNowResult> }) {
  if (query.isPending) {
    return <p className="text-muted-foreground text-sm">Checking who is on duty…</p>;
  }

  if (query.isError) {
    return (
      <p className="text-destructive text-sm">
        {query.error instanceof Error ? query.error.message : "Could not load on-duty staff."}
      </p>
    );
  }

  const { items } = query.data;

  return (
    <section className="flex flex-col gap-3" data-test="on-duty-now">
      <div>
        <h3 className="text-sm font-semibold">On duty now</h3>
        <p className="text-muted-foreground text-xs">
          Assignments whose shift is in progress. Refreshes every 15 seconds.
        </p>
      </div>
      {items.length === 0 ? (
        <p className="text-muted-foreground text-sm">Nobody is on a shift right now.</p>
      ) : (
        <ul className="divide-border divide-y rounded-xl border">
          {items.map((item) => (
            <li
              key={item.assignmentId}
              className="flex flex-col gap-0.5 px-3 py-2 sm:flex-row sm:items-baseline sm:justify-between"
            >
              <p className="text-sm">
                {item.userName} <span className="text-muted-foreground">· {item.skillName}</span>
              </p>
              <p className="text-muted-foreground text-xs tabular-nums">
                {item.locationName} · {item.startTime}–{item.endTime}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
