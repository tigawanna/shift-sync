import { OnDutyNow } from "../../-components/OnDutyNow";
import { managerOnDutyNowQueryOptions } from "../-data-access-layer/manager-on-duty.query-options";
import { useQuery } from "@tanstack/react-query";
import { ManagerQuickTiles } from "./ManagerQuickTiles";

export function ManagerOverview() {
  const onDutyQuery = useQuery(managerOnDutyNowQueryOptions());
  return (
    <>
      <OnDutyNow query={onDutyQuery} />
      <ManagerQuickTiles />
    </>
  );
}
