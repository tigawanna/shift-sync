import type { LocationRecord } from "@/data-access-layer/location/location.types";
import { formatTimezone } from "@/utils/date";

type LocationsTableProps = {
  locations: LocationRecord[];
  emptyMessage: string;
};


export function LocationsTable({ locations, emptyMessage }: LocationsTableProps) {
  if (locations.length === 0) {
    return (
      <div className="border-base-content/10 bg-base-100/50 rounded-2xl border px-6 py-10 text-center">
        <p className="text-base-content/70 text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="border-base-content/10 overflow-hidden rounded-2xl border">
      <table className="w-full text-left text-sm">
        <thead className="bg-base-300/60 text-base-content/60 text-xs uppercase tracking-wide">
          <tr>
            <th className="px-4 py-3 font-medium">Location</th>
            <th className="px-4 py-3 font-medium">Timezone</th>
            <th className="px-4 py-3 font-medium">Managers</th>
            <th className="px-4 py-3 font-medium">Staff</th>
          </tr>
        </thead>
        <tbody className="divide-base-content/10 divide-y">
          {locations.map((location) => (
            <tr key={location.id} className="bg-base-100/70">
              <td className="px-4 py-3">
                <div className="font-medium">{location.name}</div>
                {location.address ? (
                  <div className="text-base-content/60 mt-0.5 text-xs">{location.address}</div>
                ) : null}
              </td>
              <td className="text-base-content/70 px-4 py-3 font-mono text-xs">
                {formatTimezone(location.timezone)}
              </td>
              <td className="text-base-content/70 px-4 py-3">{location.managerCount}</td>
              <td className="text-base-content/70 px-4 py-3">{location.staffCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
