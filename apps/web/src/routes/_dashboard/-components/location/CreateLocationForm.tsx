import { createLocation } from "@/data-access-layer/location/location.functions";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

const COMMON_TIMEZONES = [
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "America/Phoenix",
  "Pacific/Honolulu",
] as const;

type CreateLocationFormProps = {
  onCancel: () => void;
  onCreated: () => void;
};

export function CreateLocationForm({ onCancel, onCreated }: CreateLocationFormProps) {
  const [name, setName] = useState("");
  const [timezone, setTimezone] = useState<string>(COMMON_TIMEZONES[0]);
  const [address, setAddress] = useState("");

  const createMutation = useMutation({
    mutationFn: async () => {
      return createLocation({
        data: {
          name,
          timezone,
          address: address.trim() || undefined,
        },
      });
    },
    onSuccess: () => {
      toast.success("Location created.");
      onCreated();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not create location.");
    },
  });

  return (
    <form
      className="border-base-content/10 bg-base-100/70 flex flex-col gap-4 rounded-2xl border p-6"
      onSubmit={(event) => {
        event.preventDefault();
        createMutation.mutate();
      }}
    >
      <h2 className="text-lg font-semibold tracking-tight">New location</h2>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-base-content/60 text-xs">Name</span>
        <input
          className="input-bordered input"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Harbor House"
          required
          minLength={2}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-base-content/60 text-xs">Timezone</span>
        <select
          className="select-bordered select"
          value={timezone}
          onChange={(event) => setTimezone(event.target.value)}
        >
          {COMMON_TIMEZONES.map((tz) => (
            <option key={tz} value={tz}>
              {tz}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-base-content/60 text-xs">Address (optional)</span>
        <input
          className="input-bordered input"
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          placeholder="123 Ocean Ave, Santa Monica, CA"
        />
      </label>

      <div className="flex flex-wrap gap-2">
        <button type="submit" className="btn btn-primary btn-sm" disabled={createMutation.isPending}>
          {createMutation.isPending ? "Creating…" : "Create location"}
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
