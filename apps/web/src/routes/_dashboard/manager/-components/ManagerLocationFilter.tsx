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
import { formatTimezone } from "@/utils/date";
import { useDebouncedCallback } from "@tanstack/react-pacer";
import { useQuery } from "@tanstack/react-query";
import { MapPin } from "lucide-react";
import { useMemo, useState } from "react";
import { myManagerLocationsQueryOptions } from "../-data-access-layer/manager-locations.query-options";

export function ManagerLocationFilter({
  locationId,
  onSelect,
  allLabel = "All my locations",
  description,
  required = false,
}: {
  locationId: string | undefined;
  onSelect: (locationId: string | undefined) => void;
  allLabel?: string;
  description: string;
  required?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const locationsQuery = useQuery(myManagerLocationsQueryOptions());
  const selected = locationsQuery.data?.items.find((location) => location.id === locationId);
  const label = selected?.name ?? (required ? "Choose location" : allLabel);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <div className="flex flex-wrap items-center gap-2" data-test="manager-location-filter">
        <SheetTrigger className="btn btn-outline btn-sm">
          <MapPin className="size-4" />
          {label}
        </SheetTrigger>
        {selected ? (
          <p className="text-muted-foreground text-xs">{formatTimezone(selected.timezone)}</p>
        ) : null}
      </div>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Location</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        {open ? (
          <ManagerLocationFilterBody
            selectedId={locationId}
            allLabel={required ? undefined : allLabel}
            onSelect={(nextId) => {
              if (required && !nextId) return;
              onSelect(nextId);
              setOpen(false);
            }}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function ManagerLocationFilterBody({
  selectedId,
  allLabel,
  onSelect,
}: {
  selectedId: string | undefined;
  allLabel?: string;
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
  const locationsQuery = useQuery(myManagerLocationsQueryOptions());
  const filtered = useMemo(() => {
    const items = locationsQuery.data?.items ?? [];
    const needle = sq.toLowerCase();
    if (!needle) return items;
    return items.filter((location) => {
      const address = location.address ?? "";
      return location.name.toLowerCase().includes(needle) || address.toLowerCase().includes(needle);
    });
  }, [locationsQuery.data?.items, sq]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / LOCATION_PICKER_LIMIT));
  const pageItems = filtered.slice(
    (page - 1) * LOCATION_PICKER_LIMIT,
    page * LOCATION_PICKER_LIMIT,
  );
  const searching = sq.length > 0;
  const isDebouncing = inputValue.trim() !== sq;

  let summary = `${total} ${total === 1 ? "location" : "locations"}.`;
  if (total === 0 && searching) summary = "No matches.";
  else if (total > pageItems.length) {
    summary = `Showing ${pageItems.length} of ${total}. Search to find another.`;
  }

  return (
    <SearchablePickList
      items={pageItems.map((location) => ({
        id: location.id,
        label: location.name,
        hint: formatTimezone(location.timezone),
      }))}
      selectedId={selectedId}
      onSelect={onSelect}
      allLabel={allLabel}
      isPending={locationsQuery.isPending}
      summary={summary}
      inputValue={inputValue}
      onInputChange={(value) => {
        setInputValue(value);
        commitSearch(value);
      }}
      isDebouncing={isDebouncing || locationsQuery.isFetching}
      placeholder="Search by name or address"
      searchTestId="manager-location-search"
      page={page}
      totalPages={totalPages}
      onPageChange={setPage}
    />
  );
}
