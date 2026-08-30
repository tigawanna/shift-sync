import { formatUsd } from "@/lib/schedule/labor";
import { managerLaborReportQueryOptions } from "../../-data-access-layer/manager-schedule.query-options";
import { useQuery } from "@tanstack/react-query";

function desiredCell(person: { desiredHours: number | null; hoursVsDesired: number | null }) {
  if (person.desiredHours === null || person.hoursVsDesired === null) return "—";
  const sign = person.hoursVsDesired >= 0 ? "+" : "";
  return `${sign}${person.hoursVsDesired.toFixed(1)}h vs ${person.desiredHours}h`;
}

export function ManagerLaborReport({
  locationId,
  weekStart,
}: {
  locationId: string;
  weekStart: string;
}) {
  const reportQuery = useQuery(managerLaborReportQueryOptions({ locationId, weekStart }));
  const report = reportQuery.data;

  if (reportQuery.isPending) {
    return <p className="text-muted-foreground text-sm">Loading overtime and fairness…</p>;
  }

  if (reportQuery.isError || !report) {
    return (
      <p className="text-destructive text-sm">
        {reportQuery.error instanceof Error
          ? reportQuery.error.message
          : "Could not load the labor report."}
      </p>
    );
  }

  return (
    <section className="flex flex-col gap-4" data-test="manager-labor-report">
      <div>
        <h3 className="text-sm font-semibold">Overtime and fairness</h3>
        <p className="text-muted-foreground text-xs">
          Weekly hours include every location. Overtime is time over 40h at $22 × 1.5. Premium is a
          Friday or Saturday start at 16:00 or later in this location timezone.
        </p>
      </div>
      <dl className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border p-3">
          <dt className="text-muted-foreground text-xs">Projected overtime cost</dt>
          <dd className="text-lg font-semibold tabular-nums">
            {formatUsd(report.overtimeCostUsd)}
          </dd>
        </div>
        <div className="rounded-xl border p-3">
          <dt className="text-muted-foreground text-xs">Premium fairness</dt>
          <dd className="text-lg font-semibold tabular-nums">{report.fairnessScore} / 100</dd>
        </div>
        <div className="rounded-xl border p-3">
          <dt className="text-muted-foreground text-xs">Premium assignments</dt>
          <dd className="text-lg font-semibold tabular-nums">{report.premiumShiftCount}</dd>
        </div>
      </dl>

      {report.people.length === 0 ? (
        <p className="text-muted-foreground text-sm">No one is assigned this week yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 text-muted-foreground text-left text-xs tracking-wide uppercase">
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Week hours</th>
                <th className="px-3 py-2 font-medium">Desired</th>
                <th className="px-3 py-2 font-medium">OT</th>
                <th className="px-3 py-2 font-medium">Premium</th>
              </tr>
            </thead>
            <tbody>
              {report.people.map((person) => (
                <tr key={person.userId} className="border-t">
                  <td className="px-3 py-2">
                    {person.name}
                    {person.pushingOvertime ? (
                      <span className="text-warning ml-2 text-xs">over 40h</span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 tabular-nums">{person.weekHours.toFixed(1)}h</td>
                  <td className="px-3 py-2 tabular-nums">{desiredCell(person)}</td>
                  <td className="px-3 py-2 tabular-nums">
                    {person.overtimeHours > 0
                      ? `${person.overtimeHours.toFixed(1)}h · ${formatUsd(person.overtimeCostUsd)}`
                      : "—"}
                  </td>
                  <td className="px-3 py-2 tabular-nums">{person.premiumCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
