import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatDayLabel } from "@/lib/time/zoned";
import { useState } from "react";

export function StaffScheduleBlockHoursDialog({
  date,
  pending,
  onOpenChange,
  onSubmit,
}: {
  date: string | null;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: { start: string; end: string }) => void;
}) {
  const [start, setStart] = useState("16:00");
  const [end, setEnd] = useState("22:00");

  return (
    <Dialog open={date !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Block hours</DialogTitle>
          <DialogDescription>
            {date ? `Mark time you cannot work on ${formatDayLabel(date)}.` : null}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5 text-xs">
            From
            <Input type="time" value={start} onChange={(event) => setStart(event.target.value)} />
          </label>
          <label className="flex flex-col gap-1.5 text-xs">
            To
            <Input type="time" value={end} onChange={(event) => setEnd(event.target.value)} />
          </label>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={pending || !start || !end}
            onClick={() => onSubmit({ start, end })}
          >
            {pending ? "Saving…" : "Block hours"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
