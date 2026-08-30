import { LaborReportView } from "../../../-components/LaborReportView";
import { adminLaborReportQueryOptions } from "../../-data-access-layer/admin-schedules.query-options";
import { useSuspenseQuery } from "@tanstack/react-query";

export function AdminLaborReport({
  locationId,
  weekStart,
}: {
  locationId?: string;
  weekStart: string;
}) {
  const { data: report } = useSuspenseQuery(
    adminLaborReportQueryOptions({ locationId, weekStart }),
  );

  return <LaborReportView report={report} testId="admin-labor-report" linkStaff />;
}
