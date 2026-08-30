import { LOCATION_PICKER_LIMIT } from "@/components/pagination/constants";
import { SearchablePickList } from "@/components/picker/SearchablePickList";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  listLocationsQueryOptions,
  locationQueryOptions,
} from "@/routes/_dashboard/admin/-data-access-layer/locations.query-options";
import { formatTimezone } from "@/utils/date";
import { useDebouncedCallback } from "@tanstack/react-pacer";
import { useQuery } from "@tanstack/react-query";
import { ListFilter, MapPin } from "lucide-react";
import { useState } from "react";

export function LocationFilterSheet({
  locationId,
  onSelect,
  description,
  searchTestId = "admin-location-search",
  dataTest = "admin-location-filter",
  showTimezone = true,
  triggerLabel,
}: {
  locationId: string | undefined;
  onSelect: (locationId: string | undefined) => void;
  description: string;
  searchTestId?: string;
  dataTest?: string;
  showTimezone?: boolean;
  triggerLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const selectedQuery = useQuery({
    ...locationQueryOptions(locationId ?? ""),
    enabled: Boolean(locationId),
  });
  const locationName = locationId
    ? (selectedQuery.data?.name ?? "Selected location")
    : "All locations";
  const label = triggerLabel ?? locationName;
  const Icon = triggerLabel ? ListFilter : MapPin;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <div className="flex flex-wrap items-center gap-2" data-test={dataTest}>
        <SheetTrigger className="btn btn-outline btn-sm shrink-0">
          <Icon className="size-4" />
          {label}
          {triggerLabel && locationId ? (
            <span className="bg-primary size-1.5 rounded-full" aria-hidden />
          ) : null}
        </SheetTrigger>
        {showTimezone && selectedQuery.data ? (
          <p className="text-muted-foreground text-xs">
            {formatTimezone(selectedQuery.data.timezone)}
          </p>
        ) : null}
      </div>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Location</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        {open ? (
          <LocationPickList
            selectedId={locationId}
            searchTestId={searchTestId}
            onSelect={(nextId) => {
              onSelect(nextId);
              setOpen(false);
            }}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

export function LocationPickList({
  selectedId,
  onSelect,
  searchTestId,
}: {
  selectedId: string | undefined;
  onSelect: (locationId: string | undefined) => void;
  searchTestId: string;
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

  let summary = `${total} ${total === 1 ? "location" : "locations"}.`;
  if (total === 0 && searching) summary = "No matches.";
  else if (total > items.length) {
    summary = `Showing ${items.length} of ${total}. Search to find another.`;
  }

  return (
    <SearchablePickList
      items={items.map((location) => ({
        id: location.id,
        label: location.name,
        hint: formatTimezone(location.timezone),
      }))}
      selectedId={selectedId}
      onSelect={onSelect}
      allLabel="All locations"
      isPending={listQuery.isPending}
      summary={summary}
      inputValue={inputValue}
      onInputChange={(value) => {
        setInputValue(value);
        commitSearch(value);
      }}
      isDebouncing={isDebouncing || listQuery.isFetching}
      placeholder="Search by name or address"
      searchTestId={searchTestId}
      page={page}
      totalPages={totalPages}
      onPageChange={setPage}
    />
  );
}
