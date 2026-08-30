import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import type { StaffScheduleShift } from "@/routes/_dashboard/staff/-data-access-layer/staff-schedule.fn";
import { shiftTimeLabel } from "@/routes/_dashboard/staff/-components/staff-schedule/staff-schedule.spans";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { requestAdminStaffScheduleChange } from "../../-data-access-layer/staff-calendar.fn";

export function AdminStaffChangeSheet({
  staffId,
  staffName,
  shifts,
  onClose,
}: {
  staffId: string;
  staffName: string;
  shifts: StaffScheduleShift[] | null;
  onClose: () => void;
}) {
  return (
    <Sheet open={Boolean(shifts)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Ask a manager to change this</SheetTitle>
          <SheetDescription>
            Admins do not edit assignments here. The location manager gets a request and makes the
            change on their schedule board.
          </SheetDescription>
        </SheetHeader>
        {shifts ? (
          <ChangeSheetBody
            key={shifts.map((shift) => shift.id).join(":")}
            staffId={staffId}
            staffName={staffName}
            shifts={shifts}
            onClose={onClose}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function ChangeSheetBody({
  staffId,
  staffName,
  shifts,
  onClose,
}: {
  staffId: string;
  staffName: string;
  shifts: StaffScheduleShift[];
  onClose: () => void;
}) {
  const [note, setNote] = useState("");
  const send = useMutation({
    mutationFn: () =>
      requestAdminStaffScheduleChange({
        data: {
          staffId,
          shiftIds: shifts.map((shift) => shift.id),
          note,
        },
      }),
    onSuccess: () => {
      toast.success(`Request sent to the manager for ${staffName}.`);
      onClose();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not send that request.");
    },
  });

  return (
    <form
      className="flex flex-col gap-5 px-4 pb-8"
      onSubmit={(event) => {
        event.preventDefault();
        send.mutate();
      }}
    >
      <ul className="flex flex-col gap-2 text-sm">
        {shifts.map((shift) => (
          <li key={shift.id} className="rounded-lg border px-3 py-2">
            <p className="font-medium">{shift.locationName}</p>
            <p className="text-muted-foreground text-xs">
              {shift.skillName} · {shift.startDate} · {shiftTimeLabel(shift)}
              {shift.published ? "" : " · unpublished"}
            </p>
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-2">
        <Label htmlFor="admin-staff-change-note">What should change</Label>
        <Textarea
          id="admin-staff-change-note"
          required
          minLength={1}
          maxLength={500}
          rows={4}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="e.g. Move this off Saturday evening, or split the overtime across two people."
          data-test="admin-staff-change-note"
        />
      </div>
      <button
        type="submit"
        className="btn btn-primary btn-sm w-fit"
        disabled={send.isPending || note.trim().length === 0}
        data-test="admin-staff-change-submit"
      >
        {send.isPending ? "Sending…" : "Send to manager"}
      </button>
    </form>
  );
}
