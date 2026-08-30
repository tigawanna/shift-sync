import { ShiftHistory } from "./ShiftHistory";
import { WEEKLY_HOURS_LIMIT } from "@/lib/schedule/assign-constraints";
import { SearchBox } from "@/components/search/SearchBox";
import { SearchablePickList } from "@/components/picker/SearchablePickList";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { ManagerWeekShift } from "../../-data-access-layer/manager-schedule.fn";
import {
  assignManagerShift,
  createManagerShift,
  deleteManagerShift,
  unassignManagerShift,
  updateManagerShift,
} from "../../-data-access-layer/manager-shifts.fn";
import {
  managerSkillsQueryOptions,
  staffForManagerShiftQueryOptions,
} from "../../-data-access-layer/manager-schedule.query-options";
import { useDebouncedCallback } from "@tanstack/react-pacer";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

type CreateDraft = {
  kind: "create";
  locationId: string;
  startDate: string;
};

type EditDraft = {
  kind: "edit";
  locationId: string;
  shift: ManagerWeekShift;
  published: boolean;
};

export type ManagerShiftPanel = CreateDraft | EditDraft;

function panelKey(panel: ManagerShiftPanel) {
  if (panel.kind === "create") return `create:${panel.locationId}:${panel.startDate}`;
  return `edit:${panel.shift.id}`;
}

function SkillPickField({
  skills,
  value,
  onChange,
  disabled,
}: {
  skills: { id: string; name: string }[];
  value: string;
  onChange: (id: string) => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const selected = skills.find((skill) => skill.id === value);
  const needle = inputValue.trim().toLowerCase();
  const items = needle
    ? skills.filter((skill) => skill.name.toLowerCase().includes(needle))
    : skills;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        className="btn btn-outline btn-sm w-fit"
        disabled={disabled}
        data-test="manager-skill-pick"
      >
        {selected?.name ?? "Choose skill"}
      </SheetTrigger>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Required skill</SheetTitle>
          <SheetDescription>Search the skill catalog for this shift.</SheetDescription>
        </SheetHeader>
        <SearchablePickList
          items={items.map((skill) => ({ id: skill.id, label: skill.name }))}
          selectedId={value || undefined}
          onSelect={(id) => {
            if (!id) return;
            onChange(id);
            setOpen(false);
          }}
          isPending={false}
          summary={
            items.length === 0
              ? "No matches."
              : `${items.length} ${items.length === 1 ? "skill" : "skills"}.`
          }
          inputValue={inputValue}
          onInputChange={setInputValue}
          isDebouncing={false}
          placeholder="Search skills"
          searchTestId="manager-skill-search"
        />
      </SheetContent>
    </Sheet>
  );
}

export function ManagerShiftSheet({
  panel,
  onClose,
}: {
  panel: ManagerShiftPanel | null;
  onClose: () => void;
}) {
  return (
    <Sheet open={Boolean(panel)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{panel?.kind === "edit" ? "Edit shift" : "Add shift"}</SheetTitle>
          <SheetDescription>
            Times use this location timezone. End before start means overnight.
          </SheetDescription>
        </SheetHeader>
        {panel ? <ShiftSheetBody key={panelKey(panel)} panel={panel} onClose={onClose} /> : null}
      </SheetContent>
    </Sheet>
  );
}

function ShiftSheetBody({ panel, onClose }: { panel: ManagerShiftPanel; onClose: () => void }) {
  const queryClient = useQueryClient();
  const skillsQuery = useQuery(managerSkillsQueryOptions());
  const skills = skillsQuery.data ?? [];
  const creating = panel.kind === "create";
  const shiftId = panel.kind === "edit" ? panel.shift.id : "";

  const [staffInput, setStaffInput] = useState("");
  const [staffQueryText, setStaffQueryText] = useState("");
  const commitStaffSearch = useDebouncedCallback(
    (value: string) => {
      setStaffQueryText(value.trim());
    },
    { wait: 400 },
  );

  const staffQuery = useQuery({
    ...staffForManagerShiftQueryOptions(shiftId, staffQueryText),
    enabled: Boolean(shiftId),
  });

  const [startDate, setStartDate] = useState(creating ? panel.startDate : panel.shift.startDate);
  const [startTime, setStartTime] = useState(creating ? "16:00" : panel.shift.startTime);
  const [endTime, setEndTime] = useState(creating ? "22:00" : panel.shift.endTime);
  const [skillId, setSkillId] = useState(creating ? "" : panel.shift.skillId);
  const [headcountNeeded, setHeadcountNeeded] = useState(
    creating ? 2 : panel.shift.headcountNeeded,
  );
  const [notes, setNotes] = useState(creating ? "" : (panel.shift.notes ?? ""));

  const resolvedSkillId = skillId || skills[0]?.id || "";
  const canMutate = panel.kind === "create" || !(panel.published && panel.shift.locked);

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["manager-schedule"] }),
      queryClient.invalidateQueries({ queryKey: ["manager-schedules"] }),
      queryClient.invalidateQueries({ queryKey: ["manager-shift-staff"] }),
      queryClient.invalidateQueries({ queryKey: ["staff-schedule"] }),
      queryClient.invalidateQueries({ queryKey: ["manager-labor"] }),
      queryClient.invalidateQueries({ queryKey: ["manager-shift-audit"] }),
      queryClient.invalidateQueries({ queryKey: ["admin-audit"] }),
    ]);
  };

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        skillId: resolvedSkillId,
        startDate,
        startTime,
        endTime,
        headcountNeeded,
        notes: notes.trim() || undefined,
      };
      if (creating) {
        return createManagerShift({ data: { locationId: panel.locationId, ...payload } });
      }
      return updateManagerShift({ data: { shiftId: panel.shift.id, ...payload } });
    },
    onSuccess: async () => {
      onClose();
      await invalidate();
      toast.success(creating ? "Shift created." : "Shift updated.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not save this shift.");
    },
  });

  const remove = useMutation({
    mutationFn: () => {
      if (creating) throw new Error("No shift selected.");
      return deleteManagerShift({ data: { shiftId: panel.shift.id } });
    },
    onSuccess: async () => {
      await invalidate();
      toast.success("Shift deleted.");
      onClose();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not delete this shift.");
    },
  });

  const assign = useMutation({
    mutationFn: ({ userId, overrideReason }: { userId: string; overrideReason?: string }) => {
      if (creating) throw new Error("No shift selected.");
      return assignManagerShift({
        data: { shiftId: panel.shift.id, userId, overrideReason },
      });
    },
    onSuccess: async () => {
      await invalidate();
      toast.success("Staff assigned.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not assign staff.", {
        duration: 10_000,
      });
    },
  });

  const unassign = useMutation({
    mutationFn: (userId: string) => {
      if (creating) throw new Error("No shift selected.");
      return unassignManagerShift({ data: { shiftId: panel.shift.id, userId } });
    },
    onSuccess: async () => {
      await invalidate();
      toast.success("Assignment removed.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not remove assignment.");
    },
  });

  return (
    <>
      <form
        className="flex flex-col gap-4 px-4 pb-8"
        onSubmit={(event) => {
          event.preventDefault();
          save.mutate();
        }}
      >
        {!canMutate ? (
          <p className="text-muted-foreground text-xs">
            This published shift is inside the 48-hour cutoff, so it cannot be changed.
          </p>
        ) : null}

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground text-xs">Date</span>
          <Input
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            disabled={!canMutate}
            required
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground text-xs">Starts</span>
            <Input
              type="time"
              value={startTime}
              onChange={(event) => setStartTime(event.target.value)}
              disabled={!canMutate}
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground text-xs">Ends</span>
            <Input
              type="time"
              value={endTime}
              onChange={(event) => setEndTime(event.target.value)}
              disabled={!canMutate}
              required
            />
          </label>
        </div>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground text-xs">Required skill</span>
          <SkillPickField
            skills={skills}
            value={resolvedSkillId}
            onChange={setSkillId}
            disabled={!canMutate}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground text-xs">Headcount</span>
          <Input
            type="number"
            min={1}
            max={20}
            value={headcountNeeded}
            onChange={(event) => setHeadcountNeeded(Number(event.target.value))}
            disabled={!canMutate}
            required
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground text-xs">Notes</span>
          <Input
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            disabled={!canMutate}
          />
        </label>

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            className="btn btn-primary btn-sm"
            disabled={!canMutate || save.isPending || !resolvedSkillId}
            data-test="manager-save-shift"
          >
            {creating ? "Create shift" : "Save changes"}
          </button>
          {creating ? null : (
            <ConfirmAction
              title="Delete this shift?"
              description="Assignments on this shift will be removed."
              confirmLabel="Delete shift"
              disabled={!canMutate || remove.isPending}
              onConfirm={() => remove.mutate()}
            >
              <button
                type="button"
                className="btn btn-outline btn-sm text-destructive"
                disabled={!canMutate || remove.isPending}
                data-test="manager-delete-shift"
              >
                Delete shift
              </button>
            </ConfirmAction>
          )}
        </div>
      </form>

      {creating ? null : (
        <AssignStaffSection
          canMutate={canMutate}
          staffInput={staffInput}
          staffQueryText={staffQueryText}
          onStaffInput={(value) => {
            setStaffInput(value);
            commitStaffSearch(value);
          }}
          staffPending={staffQuery.isPending}
          staffData={staffQuery.data}
          assignPending={assign.isPending}
          unassignPending={unassign.isPending}
          onAssign={(userId, overrideReason) => assign.mutate({ userId, overrideReason })}
          onUnassign={(userId) => unassign.mutate(userId)}
        />
      )}
      {creating ? null : <ShiftHistory shiftId={shiftId} />}
    </>
  );
}

type ShiftStaffPerson = {
  id: string;
  name: string;
  email: string;
  assigned: boolean;
  blockers: string[];
  warnings: string[];
  requiresOverride: boolean;
  weeklyHoursAfter: number;
};

function assignStaffSummary(input: {
  assignedCount: number;
  shown: number;
  total: number;
  searching: boolean;
}) {
  const assigned = input.assignedCount === 1 ? "1 assigned." : `${input.assignedCount} assigned.`;

  if (input.total > input.shown) {
    return `${assigned} Showing ${input.shown} of ${input.total} more. Search to find someone.`;
  }
  if (input.total === 0 && input.searching) {
    return `${assigned} No matches.`;
  }
  if (input.total === 0) {
    return `${assigned} No other qualified staff.`;
  }
  return `${assigned} ${input.total} more with this skill.`;
}

function AssignStaffSection({
  canMutate,
  staffInput,
  staffQueryText,
  onStaffInput,
  staffPending,
  staffData,
  assignPending,
  unassignPending,
  onAssign,
  onUnassign,
}: {
  canMutate: boolean;
  staffInput: string;
  staffQueryText: string;
  onStaffInput: (value: string) => void;
  staffPending: boolean;
  staffData:
    | {
        assigned: ShiftStaffPerson[];
        candidates: ShiftStaffPerson[];
        totalCandidates: number;
      }
    | undefined;
  assignPending: boolean;
  unassignPending: boolean;
  onAssign: (userId: string, overrideReason?: string) => void;
  onUnassign: (userId: string) => void;
}) {
  const people = [...(staffData?.assigned ?? []), ...(staffData?.candidates ?? [])];

  return (
    <section className="flex flex-col gap-2 px-4 pb-8">
      <h3 className="text-sm font-medium">Assign staff</h3>
      <p className="text-muted-foreground text-xs">
        Only people with this skill and location cert. Search by name or email — we load a short
        list, not everyone.
      </p>
      <SearchBox
        keyword={staffInput}
        setKeyword={onStaffInput}
        isDebouncing={staffInput.trim() !== staffQueryText}
        placeholder="Search by name or email"
        data-test="manager-assign-search"
      />
      {staffPending ? <p className="text-muted-foreground text-xs">Loading people…</p> : null}
      {staffData ? (
        <p className="text-muted-foreground text-xs">
          {assignStaffSummary({
            assignedCount: staffData.assigned.length,
            shown: staffData.candidates.length,
            total: staffData.totalCandidates,
            searching: staffQueryText.length > 0,
          })}
        </p>
      ) : null}
      <ul className="flex flex-col gap-2">
        {people.map((person) => (
          <AssignStaffRow
            key={person.id}
            person={person}
            canMutate={canMutate}
            busy={assignPending || unassignPending}
            onAssign={(overrideReason) => onAssign(person.id, overrideReason)}
            onUnassign={() => onUnassign(person.id)}
          />
        ))}
      </ul>
    </section>
  );
}

function AssignStaffAction({
  person,
  canMutate,
  busy,
  assignDisabled,
  overrideReason,
  onAssign,
  onUnassign,
}: {
  person: ShiftStaffPerson;
  canMutate: boolean;
  busy: boolean;
  assignDisabled: boolean;
  overrideReason: string;
  onAssign: (overrideReason?: string) => void;
  onUnassign: () => void;
}) {
  if (person.assigned) {
    return (
      <button
        type="button"
        className="btn btn-ghost btn-xs"
        disabled={!canMutate || busy}
        onClick={onUnassign}
      >
        Remove
      </button>
    );
  }

  if (person.warnings.length > 0 && person.blockers.length === 0 && !person.requiresOverride) {
    return (
      <ConfirmAction
        title={`Assign ${person.name}?`}
        description={person.warnings.join(" ")}
        confirmLabel="Assign anyway"
        confirmVariant="default"
        disabled={assignDisabled}
        onConfirm={() => onAssign()}
      >
        <button type="button" className="btn btn-outline btn-xs" disabled={assignDisabled}>
          Assign
        </button>
      </ConfirmAction>
    );
  }

  return (
    <button
      type="button"
      className="btn btn-outline btn-xs"
      disabled={assignDisabled}
      onClick={() => onAssign(person.requiresOverride ? overrideReason.trim() : undefined)}
    >
      Assign
    </button>
  );
}

function AssignStaffRow({
  person,
  canMutate,
  busy,
  onAssign,
  onUnassign,
}: {
  person: ShiftStaffPerson;
  canMutate: boolean;
  busy: boolean;
  onAssign: (overrideReason?: string) => void;
  onUnassign: () => void;
}) {
  const [overrideReason, setOverrideReason] = useState("");
  const reasonReady = overrideReason.trim().length >= 8;
  const blocked = person.blockers.length > 0;
  const assignDisabled = !canMutate || busy || blocked || (person.requiresOverride && !reasonReady);

  return (
    <li className="flex flex-col gap-2 rounded-lg border px-3 py-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm">{person.name}</p>
          <p className="text-muted-foreground text-xs">{person.email}</p>
          <p className="text-muted-foreground text-xs tabular-nums">
            {person.assigned
              ? `${person.weeklyHoursAfter.toFixed(1)}h this week`
              : `Would be ${person.weeklyHoursAfter.toFixed(1)}h this week`}
            {person.weeklyHoursAfter > WEEKLY_HOURS_LIMIT ? " · overtime" : ""}
          </p>
        </div>
        <AssignStaffAction
          person={person}
          canMutate={canMutate}
          busy={busy}
          assignDisabled={assignDisabled}
          overrideReason={overrideReason}
          onAssign={onAssign}
          onUnassign={onUnassign}
        />
      </div>
      {person.assigned ? null : (
        <>
          {person.blockers.map((message) => (
            <p key={message} className="text-destructive text-xs">
              {message}
            </p>
          ))}
          {person.warnings.map((message) => (
            <p key={message} className="text-muted-foreground text-xs">
              {message}
            </p>
          ))}
          {person.requiresOverride ? (
            <label className="flex flex-col gap-1">
              <span className="text-muted-foreground text-xs">7th-day override reason</span>
              <Textarea
                value={overrideReason}
                onChange={(event) => setOverrideReason(event.target.value)}
                disabled={!canMutate || blocked}
                maxLength={280}
                rows={2}
              />
            </label>
          ) : null}
        </>
      )}
    </li>
  );
}
