import { LocationPickList } from "@/components/picker/LocationFilterSheet";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { locationQueryOptions } from "@/routes/_dashboard/admin/-data-access-layer/locations.query-options";
import { useMutation, useQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { Download, ListFilter } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { exportAdminAudit } from "../../-data-access-layer/admin-audit.fn";

const routeApi = getRouteApi("/_dashboard/admin/audit/");

function formatAuditDay(ymd: string) {
  const [year, month, day] = ymd.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function AuditFilters() {
  const [open, setOpen] = useState(false);
  const search = routeApi.useSearch();
  const navigate = routeApi.useNavigate();
  const selectedQuery = useQuery({
    ...locationQueryOptions(search.locationId ?? ""),
    enabled: Boolean(search.locationId),
  });

  const locationLabel = search.locationId
    ? (selectedQuery.data?.name ?? "Location")
    : "All locations";

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className="btn btn-outline btn-sm shrink-0" data-test="audit-filters">
        <ListFilter className="size-4" />
        Filters
        {search.locationId ? (
          <span className="bg-primary size-1.5 rounded-full" aria-hidden />
        ) : null}
      </SheetTrigger>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Filters</SheetTitle>
          <SheetDescription>
            {formatAuditDay(search.from)} – {formatAuditDay(search.to)} · {locationLabel}
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-4 px-4">
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground text-xs">From</span>
              <Input
                type="date"
                value={search.from}
                onChange={(event) =>
                  void navigate({
                    to: ".",
                    search: (prev) => ({ ...prev, from: event.target.value, page: 1 }),
                    replace: true,
                  })
                }
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground text-xs">To</span>
              <Input
                type="date"
                value={search.to}
                onChange={(event) =>
                  void navigate({
                    to: ".",
                    search: (prev) => ({ ...prev, to: event.target.value, page: 1 }),
                    replace: true,
                  })
                }
              />
            </label>
          </div>
          {open ? (
            <LocationPickList
              selectedId={search.locationId}
              searchTestId="admin-audit-location-search"
              onSelect={(locationId) => {
                void navigate({
                  to: ".",
                  search: (prev) => ({ ...prev, locationId, page: 1 }),
                  replace: true,
                });
              }}
            />
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function AuditExportButton() {
  const search = routeApi.useSearch();
  const exportCsv = useMutation({
    mutationFn: () =>
      exportAdminAudit({
        data: {
          sq: search.sq,
          locationId: search.locationId,
          from: search.from,
          to: search.to,
        },
      }),
    onSuccess: (csv) => {
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `audit-${search.from}-to-${search.to}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Audit export downloaded.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not export.");
    },
  });

  return (
    <button
      type="button"
      className="btn btn-outline btn-sm btn-square shrink-0"
      aria-label="Export CSV"
      title="Export CSV"
      disabled={exportCsv.isPending}
      onClick={() => exportCsv.mutate()}
    >
      <Download className="size-4" />
    </button>
  );
}
