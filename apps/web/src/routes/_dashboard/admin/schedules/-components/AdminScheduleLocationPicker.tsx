import { LocationFilterSheet } from "@/components/picker/LocationFilterSheet";
import { getRouteApi, useNavigate } from "@tanstack/react-router";

const layoutApi = getRouteApi("/_dashboard/admin/schedules");

export function AdminScheduleLocationPicker() {
  const { locationId } = layoutApi.useSearch();
  const navigate = useNavigate();

  return (
    <LocationFilterSheet
      locationId={locationId}
      description="Search restaurants. Leave on All locations to see every restaurant, or pick one to filter."
      searchTestId="admin-schedule-location-search"
      dataTest="admin-schedule-location"
      onSelect={(nextId) => {
        void navigate({
          to: ".",
          search: (prev) => ({ ...prev, locationId: nextId, page: undefined }),
          replace: true,
        });
      }}
    />
  );
}
