import type { ReactNode } from "react";
import { DashboardPageHeader } from "../DashboardPageHeader";
import { ScheduleMonthView } from "./ScheduleMonthView";

type ScheduleBirdsEyeProps = {
  month: string;
  selectedDate?: string;
  onMonthChange: (month: string) => void;
  onSelectDate: (date: string) => void;
  title: string;
  description: string;
  personTo: "/admin/users/$userId" | "/manager/team/$userId";
  locationSelect?: ReactNode;
};

export function ScheduleBirdsEye({
  month,
  selectedDate,
  onMonthChange,
  onSelectDate,
  title,
  description,
  personTo,
  locationSelect,
}: ScheduleBirdsEyeProps) {
  return (
    <div className="flex flex-col gap-8">
      <DashboardPageHeader title={title} description={description} />
      {locationSelect ? <div>{locationSelect}</div> : null}
      <ScheduleMonthView
        month={month}
        selectedDate={selectedDate}
        onMonthChange={onMonthChange}
        onSelectDate={onSelectDate}
        personTo={personTo}
      />
    </div>
  );
}
