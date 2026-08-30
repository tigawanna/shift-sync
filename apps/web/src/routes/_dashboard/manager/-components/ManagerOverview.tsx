import { useSuspenseQuery } from "@tanstack/react-query";
import { managerHomeQueryOptions } from "../-data-access-layer/manager-home.query-options";
import { ManagerHomeCounts } from "./ManagerHomeCounts";
import { ManagerOnDutyWidget } from "./ManagerOnDutyWidget";

export function ManagerOverview() {
  const { data } = useSuspenseQuery(managerHomeQueryOptions());

  return (
    <div className="flex flex-col gap-6">
      <ManagerHomeCounts staffCount={data.staffCount} locationCount={data.locationCount} />
      <ManagerOnDutyWidget
        overseeingCount={data.overseeingCount}
        onDutyTotal={data.onDutyTotal}
        items={data.onDuty}
      />
    </div>
  );
}
