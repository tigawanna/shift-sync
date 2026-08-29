import {
  addMyAvailabilityException,
  removeMyAvailabilityException,
  replaceMyAvailability,
} from "@/data-access-layer/staff-profile/staff-profile.functions";
import { myStaffProfileQueryOptions } from "@/data-access-layer/staff-profile/staff-profile.queries";
import type {
  StaffAvailabilityException,
  StaffWeeklyWindow,
  WeeklyWindowInput,
} from "@/data-access-layer/staff-profile/staff-profile.types";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { hmToMinutes, minutesToHm, minutesToTimeInput } from "@/lib/schedule/availability";
import { WEEKDAY_LABELS, formatDayLabel } from "@/lib/time/zoned";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

function windowsEqual(a: WeeklyWindowInput[], b: WeeklyWindowInput[]) {
  if (a.length !== b.length) return false;
  const key = (window: WeeklyWindowInput) =>
    `${window.weekday}:${window.startMinute}:${window.endMinute}`;
  const left = [...a].map(key).sort();
  const right = [...b].map(key).sort();
  return left.every((value, index) => value === right[index]);
}

function timeToMinutes(value: string, treatAsEnd: boolean) {
  if (treatAsEnd && (value === "23:59" || value === "24:00")) return 24 * 60;
  return hmToMinutes(value);
}

type AvailabilityEditorProps = {
  weeklyWindows: StaffWeeklyWindow[];
  exceptions: StaffAvailabilityException[];
};

export function AvailabilityEditor({ weeklyWindows, exceptions }: AvailabilityEditorProps) {
  const qc = useQueryClient();
  const savedWindows = useMemo(
    () =>
      weeklyWindows.map((window) => ({
        weekday: window.weekday,
        startMinute: window.startMinute,
        endMinute: window.endMinute,
      })),
    [weeklyWindows],
  );
  const [draftWindows, setDraftWindows] = useState<WeeklyWindowInput[]>(savedWindows);
  const [exceptionDate, setExceptionDate] = useState("");
  const [exceptionKind, setExceptionKind] = useState<"blocked" | "extra">("blocked");
  const [exceptionAllDay, setExceptionAllDay] = useState(true);
  const [exceptionStart, setExceptionStart] = useState("16:00");
  const [exceptionEnd, setExceptionEnd] = useState("22:00");
  const [exceptionNote, setExceptionNote] = useState("");

  const saveWeekly = useMutation({
    mutationFn: async () => replaceMyAvailability({ data: { windows: draftWindows } }),
    onSuccess: async (profile) => {
      qc.setQueryData(myStaffProfileQueryOptions().queryKey, profile);
      await qc.invalidateQueries({ queryKey: ["schedule"] });
      toast.success("Weekly availability saved.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not save availability.");
    },
  });

  const addException = useMutation({
    mutationFn: async () => {
      const allDay = exceptionKind === "blocked" && exceptionAllDay;
      return addMyAvailabilityException({
        data: {
          date: exceptionDate,
          kind: exceptionKind,
          startMinute: allDay ? 0 : hmToMinutes(exceptionStart),
          endMinute: allDay ? 24 * 60 : timeToMinutes(exceptionEnd, true),
          note: exceptionNote.trim() || undefined,
        },
      });
    },
    onSuccess: async (profile) => {
      qc.setQueryData(myStaffProfileQueryOptions().queryKey, profile);
      await qc.invalidateQueries({ queryKey: ["schedule"] });
      setExceptionNote("");
      toast.success("Exception added.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not add exception.");
    },
  });

  const removeException = useMutation({
    mutationFn: async (exceptionId: string) =>
      removeMyAvailabilityException({ data: { exceptionId } }),
    onSuccess: async (profile) => {
      qc.setQueryData(myStaffProfileQueryOptions().queryKey, profile);
      await qc.invalidateQueries({ queryKey: ["schedule"] });
      toast.success("Exception removed.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not remove exception.");
    },
  });

  const dirty = !windowsEqual(draftWindows, savedWindows);

  function addWindow(weekday: number) {
    setDraftWindows((current) => [
      ...current,
      { weekday, startMinute: 10 * 60, endMinute: 22 * 60 },
    ]);
  }

  function updateWindow(index: number, patch: Partial<WeeklyWindowInput>) {
    setDraftWindows((current) =>
      current.map((window, windowIndex) =>
        windowIndex === index ? { ...window, ...patch } : window,
      ),
    );
  }

  function removeWindow(index: number) {
    setDraftWindows((current) => current.filter((_, windowIndex) => windowIndex !== index));
  }

  return (
    <div className="flex flex-col gap-8" data-test="staff-availability-editor">
      <section className="border-base-content/10 bg-base-100/70 flex flex-col gap-4 rounded-2xl border p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-medium">Recurring weekly</h2>
            <p className="text-base-content/60 mt-1 text-sm">
              Same hours every week. Leave a day empty if you cannot work that day. Times are
              wall-clock and checked in the restaurant&apos;s timezone.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={!dirty || saveWeekly.isPending}
            onClick={() => saveWeekly.mutate()}
          >
            {saveWeekly.isPending ? "Saving…" : "Save weekly hours"}
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {WEEKDAY_ORDER.map((weekday) => {
            const dayWindows = draftWindows
              .map((window, index) => ({ window, index }))
              .filter(({ window }) => window.weekday === weekday);

            return (
              <div key={weekday} className="border-base-content/10 rounded-xl border px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{WEEKDAY_LABELS[weekday]}</p>
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs"
                    onClick={() => addWindow(weekday)}
                  >
                    <Plus className="size-3.5" />
                    Add window
                  </button>
                </div>
                {dayWindows.length === 0 ? (
                  <p className="text-base-content/50 mt-2 text-xs">Not available</p>
                ) : (
                  <ul className="mt-3 flex flex-col gap-2">
                    {dayWindows.map(({ window, index }) => {
                      const untilMidnight = window.endMinute >= 24 * 60;
                      return (
                        <li key={`${weekday}-${index}`} className="flex flex-wrap items-center gap-2">
                          <Input
                            type="time"
                            className="w-32"
                            value={minutesToTimeInput(window.startMinute)}
                            onChange={(event) =>
                              updateWindow(index, { startMinute: hmToMinutes(event.target.value) })
                            }
                          />
                          <span className="text-base-content/40 text-xs">to</span>
                          <Input
                            type="time"
                            className="w-32"
                            disabled={untilMidnight}
                            value={minutesToTimeInput(window.endMinute)}
                            onChange={(event) =>
                              updateWindow(index, {
                                endMinute: timeToMinutes(event.target.value, true),
                              })
                            }
                          />
                          <label className="text-base-content/70 flex items-center gap-1.5 text-xs">
                            <input
                              type="checkbox"
                              className="checkbox checkbox-xs"
                              checked={untilMidnight}
                              onChange={(event) =>
                                updateWindow(index, {
                                  endMinute: event.target.checked ? 24 * 60 : 22 * 60,
                                })
                              }
                            />
                            Until midnight
                          </label>
                          <button
                            type="button"
                            className="btn btn-ghost btn-xs text-error"
                            onClick={() => removeWindow(index)}
                            aria-label="Remove window"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="border-base-content/10 bg-base-100/70 flex flex-col gap-4 rounded-2xl border p-5">
        <div>
          <h2 className="text-sm font-medium">One-off exceptions</h2>
          <p className="text-base-content/60 mt-1 text-sm">
            Block a date you cannot work, or add extra hours on a day outside your usual weekly
            windows.
          </p>
        </div>

        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (!exceptionDate) {
              toast.error("Pick a date for the exception.");
              return;
            }
            addException.mutate();
          }}
        >
          <div className="flex flex-wrap gap-3">
            <label className="flex flex-col gap-1 text-xs">
              Date
              <Input
                type="date"
                className="w-40"
                value={exceptionDate}
                onChange={(event) => setExceptionDate(event.target.value)}
                required
              />
            </label>
            <label className="flex flex-col gap-1 text-xs">
              Type
              <NativeSelect
                value={exceptionKind}
                onChange={(event) =>
                  setExceptionKind(event.target.value === "extra" ? "extra" : "blocked")
                }
              >
                <NativeSelectOption value="blocked">I cannot work</NativeSelectOption>
                <NativeSelectOption value="extra">Extra hours</NativeSelectOption>
              </NativeSelect>
            </label>
            {exceptionKind === "blocked" ? (
              <label className="text-base-content/70 flex items-end gap-1.5 pb-2 text-xs">
                <input
                  type="checkbox"
                  className="checkbox checkbox-xs"
                  checked={exceptionAllDay}
                  onChange={(event) => setExceptionAllDay(event.target.checked)}
                />
                All day
              </label>
            ) : null}
            {exceptionKind === "extra" || !exceptionAllDay ? (
              <>
                <label className="flex flex-col gap-1 text-xs">
                  From
                  <Input
                    type="time"
                    className="w-32"
                    value={exceptionStart}
                    onChange={(event) => setExceptionStart(event.target.value)}
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs">
                  To
                  <Input
                    type="time"
                    className="w-32"
                    value={exceptionEnd}
                    onChange={(event) => setExceptionEnd(event.target.value)}
                  />
                </label>
              </>
            ) : null}
            <label className="flex min-w-48 flex-1 flex-col gap-1 text-xs">
              Note
              <Input
                value={exceptionNote}
                onChange={(event) => setExceptionNote(event.target.value)}
                placeholder="Optional"
              />
            </label>
          </div>
          <button type="submit" className="btn btn-primary btn-sm self-start" disabled={addException.isPending}>
            {addException.isPending ? "Adding…" : "Add exception"}
          </button>
        </form>

        {exceptions.length === 0 ? (
          <p className="text-base-content/50 text-sm">No exceptions yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {exceptions.map((exception) => (
              <li
                key={exception.id}
                className="border-base-content/10 flex items-start justify-between gap-3 rounded-xl border px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium">
                    {exception.kind === "blocked" ? "Off" : "Extra"} · {formatDayLabel(exception.date)}
                  </p>
                  <p className="text-base-content/60 text-xs">
                    {minutesToHm(exception.startMinute)}–{minutesToHm(exception.endMinute)}
                    {exception.note ? ` · ${exception.note}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-xs text-error"
                  disabled={removeException.isPending}
                  onClick={() => removeException.mutate(exception.id)}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
