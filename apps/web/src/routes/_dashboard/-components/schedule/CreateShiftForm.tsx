import { createShift } from "@/data-access-layer/schedule/schedule.functions";
import { SKILLS, type SkillId } from "@/lib/schedule/skills";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

type CreateShiftFormProps = {
  locationId: string;
  defaultDate: string;
  onCreated: () => void;
  onCancel: () => void;
};

export function CreateShiftForm({
  locationId,
  defaultDate,
  onCreated,
  onCancel,
}: CreateShiftFormProps) {
  const [startDate, setStartDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState("16:00");
  const [endTime, setEndTime] = useState("22:00");
  const [skillId, setSkillId] = useState<SkillId>("server");
  const [headcountNeeded, setHeadcountNeeded] = useState(2);
  const [notes, setNotes] = useState("");

  const createMutation = useMutation({
    mutationFn: () =>
      createShift({
        data: {
          locationId,
          skillId,
          startDate,
          startTime,
          endTime,
          headcountNeeded,
          notes: notes.trim() || undefined,
        },
      }),
    onSuccess: () => {
      toast.success("Shift created.");
      onCreated();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not create shift.");
    },
  });

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        createMutation.mutate();
      }}
    >
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-base-content/60 text-xs">Date</span>
        <input
          type="date"
          className="input-bordered input"
          value={startDate}
          onChange={(event) => setStartDate(event.target.value)}
          required
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-base-content/60 text-xs">Starts</span>
          <input
            type="time"
            className="input-bordered input"
            value={startTime}
            onChange={(event) => setStartTime(event.target.value)}
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-base-content/60 text-xs">Ends</span>
          <input
            type="time"
            className="input-bordered input"
            value={endTime}
            onChange={(event) => setEndTime(event.target.value)}
            required
          />
        </label>
      </div>
      <p className="text-base-content/55 text-xs">
        If end is earlier than start, the shift continues overnight. Times use this location&apos;s
        timezone.
      </p>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-base-content/60 text-xs">Required skill</span>
        <select
          className="select-bordered select"
          value={skillId}
          onChange={(event) => setSkillId(event.target.value as SkillId)}
        >
          {SKILLS.map((skill) => (
            <option key={skill.id} value={skill.id}>
              {skill.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-base-content/60 text-xs">Headcount needed</span>
        <input
          type="number"
          min={1}
          max={20}
          className="input-bordered input"
          value={headcountNeeded}
          onChange={(event) => setHeadcountNeeded(Number(event.target.value))}
          required
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-base-content/60 text-xs">Notes (optional)</span>
        <input
          className="input-bordered input"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Patio, banquet, etc."
        />
      </label>

      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="submit"
          className="btn btn-primary btn-sm"
          disabled={createMutation.isPending}
        >
          {createMutation.isPending ? "Creating…" : "Create shift"}
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
