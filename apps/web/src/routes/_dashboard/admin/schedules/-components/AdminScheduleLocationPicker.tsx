import { LOCATION_PICKER_LIMIT } from "@/components/pagination/constants";
import { SearchBox } from "@/components/search/SearchBox";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { formatTimezone } from "@/utils/date";
import { useDebouncedCallback } from "@tanstack/react-pacer";
import { useQuery } from "@tanstack/react-query";
import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { MapPin } from "lucide-react";
import { useState } from "react";
import {
  listLocationsQueryOptions,
  locationQueryOptions,
} from "../../-data-access-layer/locations.query-options";

const layoutApi = getRouteApi("/_dashboard/admin/schedules");

export function AdminScheduleLocationPicker() {
  const { locationId } = layoutApi.useSearch();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const selectedQuery = useQuery({
    ...locationQueryOptions(locationId ?? ""),
    enabled: Boolean(locationId),
  });

  const label = locationId ? (selectedQuery.data?.name ?? "Selected location") : "All locations";

  return (
    <>
      <div className="flex flex-wrap items-center gap-2" data-test="admin-schedule-location">
        <button type="button" className="btn btn-outline btn-sm" onClick={() => setOpen(true)}>
          <MapPin className="size-4" />
          {label}
        </button>
        {selectedQuery.data ? (
          <p className="text-muted-foreground text-xs">
            {formatTimezone(selectedQuery.data.timezone)}
          </p>
        ) : null}
      </div>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Location</SheetTitle>
            <SheetDescription>
              Search restaurants. Schedules tabs use the location you pick here.
            </SheetDescription>
          </SheetHeader>
          {open ? (
            <LocationPickerBody
              selectedId={locationId}
              onSelect={(nextId) => {
                void navigate({
                  to: ".",
                  search: (prev) => ({ ...prev, locationId: nextId, page: undefined }),
                  replace: true,
                });
                setOpen(false);
              }}
            />
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}

function LocationPickerBody({
  selectedId,
  onSelect,
}: {
  selectedId: string | undefined;
  onSelect: (locationId: string | undefined) => void;
}) {
  const [inputValue, setInputValue] = useState("");
  const [sq, setSq] = useState("");
  const [page, setPage] = useState(1);
  const commitSearch = useDebouncedCallback(
    (value: string) => {
      setSq(value.trim());
      setPage(1);
    },
    { wait: 400 },
  );

  const listQuery = useQuery(
    listLocationsQueryOptions({ page, perPage: LOCATION_PICKER_LIMIT, sq }),
  );
  const items = listQuery.data?.items ?? [];
  const total = listQuery.data?.total ?? 0;
  const totalPages = listQuery.data?.totalPages ?? 1;
  const searching = sq.length > 0;
  const isDebouncing = inputValue.trim() !== sq;

  return (
    <div className="flex flex-col gap-3 px-4 pb-4">
      <SearchBox
        keyword={inputValue}
        setKeyword={(value) => {
          setInputValue(value);
          commitSearch(value);
        }}
        isDebouncing={isDebouncing || listQuery.isFetching}
        placeholder="Search by name or address"
        data-test="admin-schedule-location-search"
      />
      <p className="text-muted-foreground text-xs">
        {listQuery.isPending
          ? "Loading locations…"
          : total === 0 && searching
            ? "No matches."
            : total > items.length
              ? `Showing ${items.length} of ${total}. Search to find another.`
              : `${total} ${total === 1 ? "location" : "locations"}.`}
      </p>
      <ul className="flex flex-col gap-1">
        <li>
          <button
            type="button"
            className={`hover:bg-muted/50 w-full rounded-lg px-3 py-2 text-left ${
              !selectedId ? "bg-muted font-medium" : ""
            }`}
            onClick={() => onSelect(undefined)}
          >
            All locations
          </button>
        </li>
        {items.map((location) => (
          <li key={location.id}>
            <button
              type="button"
              className={`hover:bg-muted/50 w-full rounded-lg px-3 py-2 text-left ${
                selectedId === location.id ? "bg-muted font-medium" : ""
              }`}
              onClick={() => onSelect(location.id)}
            >
              <span className="block text-sm">{location.name}</span>
              <span className="text-muted-foreground block text-xs">
                {formatTimezone(location.timezone)}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {totalPages > 1 ? (
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            disabled={page <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            Previous
          </button>
          <p className="text-muted-foreground text-xs tabular-nums">
            {page} / {totalPages}
          </p>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            disabled={page >= totalPages}
            onClick={() => setPage((current) => current + 1)}
          >
            Next
          </button>
        </div>
      ) : null}
    </div>
  );
}
