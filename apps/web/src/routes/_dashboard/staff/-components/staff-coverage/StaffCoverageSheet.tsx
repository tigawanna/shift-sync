import { SWAP_CANDIDATE_LIMIT } from "@/components/pagination/constants";
import { SearchBox } from "@/components/search/SearchBox";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { COVERAGE_PENDING_LIMIT } from "@/lib/schedule/coverage";
import type { StaffScheduleShift } from "@/routes/_dashboard/staff/-data-access-layer/staff-schedule.fn";
import { swapCandidatesQueryOptions } from "@/routes/_dashboard/staff/-data-access-layer/staff-coverage.query-options";
import { useDebouncedCallback } from "@tanstack/react-pacer";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { shiftTimeLabel } from "../staff-schedule/staff-schedule.spans";
import { useCoverageMutations } from "./useCoverageMutations";

export type StaffCoveragePanel = {
  intent: "swap" | "drop";
  shifts: StaffScheduleShift[];
};

function panelKey(panel: StaffCoveragePanel) {
  return `${panel.intent}:${panel.shifts.map((shift) => shift.id).join(":")}`;
}

function candidateSummary(shown: number, total: number, searching: boolean) {
  if (total === 0 && searching) return "No matches.";
  if (total === 0) return "No other qualified staff.";
  if (total > shown) return `Showing ${shown} of ${total}. Search to find someone.`;
  return `${total} qualified ${total === 1 ? "person" : "people"}.`;
}

export function StaffCoverageSheet({
  panel,
  pendingShiftIds,
  pendingCount,
  onClose,
}: {
  panel: StaffCoveragePanel | null;
  pendingShiftIds: Set<string>;
  pendingCount: number;
  onClose: () => void;
}) {
  return (
    <Sheet open={Boolean(panel)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{panel?.intent === "drop" ? "Drop shifts" : "Swap shifts"}</SheetTitle>
          <SheetDescription>
            {panel?.intent === "drop"
              ? "Offer selected dates as a drop. You stay assigned until a manager approves a pickup."
              : "Search qualified teammates. You stay assigned until they accept and a manager approves."}
          </SheetDescription>
        </SheetHeader>
        {panel ? (
          <CoverageSheetBody
            key={panelKey(panel)}
            panel={panel}
            pendingShiftIds={pendingShiftIds}
            pendingCount={pendingCount}
            onClose={onClose}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function CoverageSheetBody({
  panel,
  pendingShiftIds,
  pendingCount,
  onClose,
}: {
  panel: StaffCoveragePanel;
  pendingShiftIds: Set<string>;
  pendingCount: number;
  onClose: () => void;
}) {
  const mutations = useCoverageMutations(onClose);
  const remainingSlots = Math.max(0, COVERAGE_PENDING_LIMIT - pendingCount);
  const available = panel.shifts.filter((shift) => !pendingShiftIds.has(shift.id));
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(available.slice(0, remainingSlots).map((shift) => shift.id)),
  );

  const selectedShifts = panel.shifts.filter((shift) => selectedIds.has(shift.id));
  const selectedShiftIds = selectedShifts.map((shift) => shift.id);
  const lead = panel.shifts[0];

  const [staffInput, setStaffInput] = useState("");
  const [staffQueryText, setStaffQueryText] = useState("");
  const commitStaffSearch = useDebouncedCallback(
    (value: string) => {
      setStaffQueryText(value.trim());
    },
    { wait: 400 },
  );

  const candidatesQuery = useQuery({
    ...swapCandidatesQueryOptions(selectedShiftIds, staffQueryText),
    enabled: panel.intent === "swap" && selectedShiftIds.length > 0,
  });

  const overLimit = selectedIds.size > remainingSlots;
  const atLimit = selectedIds.size >= remainingSlots;

  function toggleShift(shiftId: string, next: boolean) {
    setSelectedIds((current) => {
      const nextSet = new Set(current);
      if (next) {
        if (nextSet.size >= remainingSlots) return current;
        nextSet.add(shiftId);
      } else {
        nextSet.delete(shiftId);
      }
      return nextSet;
    });
  }

  const canSubmit = selectedIds.size > 0 && remainingSlots > 0 && !overLimit;

  if (!lead) return null;

  return (
    <div className="flex flex-col gap-5 px-4 pb-8" data-test="staff-coverage-sheet">
      <div>
        <p className="text-sm font-medium">{lead.locationName}</p>
        <p className="text-muted-foreground text-xs">
          {lead.skillName} · {lead.timezone}
        </p>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">Dates</legend>
        <p className="text-muted-foreground text-xs">
          {remainingSlots === 0
            ? `You already have ${COVERAGE_PENDING_LIMIT} pending requests.`
            : `Pick one date or the whole run. ${remainingSlots} pending slot${remainingSlots === 1 ? "" : "s"} left (max ${COVERAGE_PENDING_LIMIT}).`}
        </p>
        {panel.shifts.length > 1 ? (
          <div className="flex gap-2">
            <Button
              type="button"
              size="xs"
              variant="outline"
              onClick={() =>
                setSelectedIds(new Set(available.slice(0, remainingSlots).map((shift) => shift.id)))
              }
            >
              All available
            </Button>
            <Button
              type="button"
              size="xs"
              variant="ghost"
              onClick={() => setSelectedIds(new Set())}
            >
              None
            </Button>
          </div>
        ) : null}
        <ul className="flex flex-col gap-1.5">
          {panel.shifts.map((shift) => {
            const blocked = pendingShiftIds.has(shift.id);
            const checked = selectedIds.has(shift.id);
            return (
              <li key={shift.id}>
                <label className="flex items-start gap-2 rounded-lg border px-3 py-2 text-sm">
                  <Checkbox
                    className="mt-0.5"
                    checked={checked}
                    disabled={blocked || remainingSlots === 0 || (!checked && atLimit)}
                    onCheckedChange={(value) => toggleShift(shift.id, value === true)}
                  />
                  <span>
                    <span className="tabular-nums">
                      {shift.startDate}
                      {shift.overnight ? `–${shift.endDate}` : ""}
                    </span>
                    <span className="text-muted-foreground block text-xs tabular-nums">
                      {shiftTimeLabel(shift)}
                      {blocked ? " · already pending" : ""}
                    </span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
        {overLimit ? (
          <p className="text-destructive text-xs">
            Uncheck dates until you are within {remainingSlots} request
            {remainingSlots === 1 ? "" : "s"}.
          </p>
        ) : null}
      </fieldset>

      {panel.intent === "drop" ? (
        <Button
          type="button"
          disabled={!canSubmit || mutations.drop.isPending}
          onClick={() => mutations.drop.mutate({ data: { shiftIds: selectedShiftIds } })}
          data-test="staff-drop-submit"
        >
          Offer as drop
        </Button>
      ) : (
        <SwapCandidateList
          shiftIds={selectedShiftIds}
          staffInput={staffInput}
          staffQueryText={staffQueryText}
          onStaffInput={(value) => {
            setStaffInput(value);
            commitStaffSearch(value);
          }}
          pending={candidatesQuery.isPending}
          data={candidatesQuery.data}
          submitting={mutations.swap.isPending}
          canSubmit={canSubmit}
          onPick={(toUserId) =>
            mutations.swap.mutate({ data: { shiftIds: selectedShiftIds, toUserId } })
          }
        />
      )}
    </div>
  );
}

function SwapCandidateList({
  shiftIds,
  staffInput,
  staffQueryText,
  onStaffInput,
  pending,
  data,
  submitting,
  canSubmit,
  onPick,
}: {
  shiftIds: string[];
  staffInput: string;
  staffQueryText: string;
  onStaffInput: (value: string) => void;
  pending: boolean;
  data: { items: Array<{ id: string; name: string; email: string }>; total: number } | undefined;
  submitting: boolean;
  canSubmit: boolean;
  onPick: (toUserId: string) => void;
}) {
  const shown = data?.items.length ?? 0;
  const total = data?.total ?? 0;
  const summary = candidateSummary(shown, total, staffQueryText.length > 0);

  if (shiftIds.length === 0) {
    return (
      <p className="text-muted-foreground text-xs">Select at least one date to search people.</p>
    );
  }

  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-sm font-medium">Swap with</h3>
      <p className="text-muted-foreground text-xs">
        Only people with this skill and location cert. We load {SWAP_CANDIDATE_LIMIT} at a time, not
        everyone.
      </p>
      <SearchBox
        keyword={staffInput}
        setKeyword={onStaffInput}
        isDebouncing={staffInput.trim() !== staffQueryText}
        placeholder="Search by name or email"
        data-test="staff-swap-search"
      />
      {pending ? <p className="text-muted-foreground text-xs">Loading people…</p> : null}
      {data ? <p className="text-muted-foreground text-xs">{summary}</p> : null}
      <ul className="flex flex-col gap-2">
        {(data?.items ?? []).map((person) => (
          <li
            key={person.id}
            className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2"
          >
            <div>
              <p className="text-sm">{person.name}</p>
              <p className="text-muted-foreground text-xs">{person.email}</p>
            </div>
            <Button
              type="button"
              size="xs"
              variant="outline"
              disabled={!canSubmit || submitting}
              onClick={() => onPick(person.id)}
              data-test="staff-swap-pick"
            >
              Ask to swap
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
