import { LaborReportView } from "../../../-components/LaborReportView";
import { adminLaborReportQueryOptions } from "../../-data-access-layer/admin-schedules.query-options";
import { useQuery } from "@tanstack/react-query";

export function AdminLaborReport({
  locationId,
  weekStart,
}: {
  locationId: string;
  weekStart: string;
}) {
  const reportQuery = useQuery(adminLaborReportQueryOptions({ locationId, weekStart }));
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

  return <LaborReportView report={report} testId="admin-labor-report" />;
}
