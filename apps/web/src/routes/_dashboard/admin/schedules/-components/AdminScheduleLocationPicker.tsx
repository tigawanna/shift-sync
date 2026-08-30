import { LocationFilterSheet } from "@/components/picker/LocationFilterSheet";
import { getRouteApi, useNavigate } from "@tanstack/react-router";

const layoutApi = getRouteApi("/_dashboard/admin/schedules");

export function AdminScheduleLocationPicker() {
  const { locationId } = layoutApi.useSearch();
  const navigate = useNavigate();

  return (
    <LocationFilterSheet
      locationId={locationId}
      description="Search restaurants. Schedules tabs use the location you pick here."
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
