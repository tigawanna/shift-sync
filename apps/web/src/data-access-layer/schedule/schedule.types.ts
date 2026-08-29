import { SKILL_IDS } from "@/lib/schedule/skills";
import { z } from "zod";
import type { ConstraintFailure, ConstraintWarning } from "@/lib/schedule/constraints";

export const weekStartDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Week start must be YYYY-MM-DD");

export const timeHmSchema = z.string().regex(/^\d{2}:\d{2}$/, "Time must be HH:MM");

export const listWeekScheduleInputSchema = z.object({
  locationId: z.string().min(1),
  weekStart: weekStartDateSchema,
});

export const createShiftInputSchema = z.object({
  locationId: z.string().min(1),
  skillId: z.enum(SKILL_IDS),
  startDate: weekStartDateSchema,
  startTime: timeHmSchema,
  endTime: timeHmSchema,
  endDate: weekStartDateSchema.optional(),
  headcountNeeded: z.number().int().min(1).max(20),
  notes: z.string().trim().max(500).optional(),
});

export const updateShiftInputSchema = z.object({
  shiftId: z.string().min(1),
  skillId: z.enum(SKILL_IDS).optional(),
  startDate: weekStartDateSchema.optional(),
  startTime: timeHmSchema.optional(),
  endTime: timeHmSchema.optional(),
  endDate: weekStartDateSchema.optional(),
  headcountNeeded: z.number().int().min(1).max(20).optional(),
  notes: z.string().trim().max(500).nullable().optional(),
});

export const shiftIdInputSchema = z.object({
  shiftId: z.string().min(1),
});

export const assignStaffInputSchema = z.object({
  shiftId: z.string().min(1),
  userId: z.string().min(1),
});

export const unassignStaffInputSchema = z.object({
  shiftId: z.string().min(1),
  userId: z.string().min(1),
});

export const publishWeekInputSchema = z.object({
  locationId: z.string().min(1),
  weekStart: weekStartDateSchema,
});

export const yearMonthSchema = z.string().regex(/^\d{4}-\d{2}$/, "Month must be YYYY-MM");

export const listMyScheduleInputSchema = z.object({
  month: yearMonthSchema,
});

export const listMonthOverviewInputSchema = z.object({
  month: yearMonthSchema,
});

export const listOverviewDayInputSchema = z.object({
  date: weekStartDateSchema,
});

export const listUserScheduleInputSchema = z.object({
  userId: z.string().min(1),
  month: yearMonthSchema,
});

export const previewLocationMoveInputSchema = z.object({
  userId: z.string().min(1),
  locationIdsCsv: z.string(),
  weekStart: weekStartDateSchema,
});

export const listDayAssignableShiftsInputSchema = z.object({
  date: weekStartDateSchema,
  userId: z.string().min(1),
});

export type ListWeekScheduleInput = z.infer<typeof listWeekScheduleInputSchema>;
export type CreateShiftInput = z.infer<typeof createShiftInputSchema>;
export type UpdateShiftInput = z.infer<typeof updateShiftInputSchema>;
export type ShiftIdInput = z.infer<typeof shiftIdInputSchema>;
export type AssignStaffInput = z.infer<typeof assignStaffInputSchema>;
export type UnassignStaffInput = z.infer<typeof unassignStaffInputSchema>;
export type PublishWeekInput = z.infer<typeof publishWeekInputSchema>;
export type ListMyScheduleInput = z.infer<typeof listMyScheduleInputSchema>;
export type ListMonthOverviewInput = z.infer<typeof listMonthOverviewInputSchema>;
export type ListOverviewDayInput = z.infer<typeof listOverviewDayInputSchema>;
export type ListUserScheduleInput = z.infer<typeof listUserScheduleInputSchema>;
export type PreviewLocationMoveInput = z.infer<typeof previewLocationMoveInputSchema>;
export type ListDayAssignableShiftsInput = z.infer<typeof listDayAssignableShiftsInputSchema>;

export type ScheduleLocationOption = {
  id: string;
  name: string;
  timezone: string;
};

export type ShiftAssignee = {
  userId: string;
  name: string;
};

export type WeekShift = {
  id: string;
  locationId: string;
  locationName: string;
  timezone: string;
  skillId: string;
  skillName: string;
  startsAt: Date;
  endsAt: Date;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  overnight: boolean;
  headcountNeeded: number;
  assignedCount: number;
  notes: string | null;
  assignees: ShiftAssignee[];
  locked: boolean;
  managers: string[];
  createdByName: string | null;
};

export type WeekDayColumn = {
  date: string;
  shifts: WeekShift[];
};

export type WeekSchedule = {
  location: ScheduleLocationOption;
  weekStart: string;
  published: boolean;
  publishedAt: Date | null;
  shifts: WeekShift[];
  days: WeekDayColumn[];
};

export type PersonMonthSchedule = {
  userId: string;
  name: string;
  email: string;
  month: string;
  monthlyHours: number;
  shifts: WeekShift[];
  weekStats: PersonCalendarWeekStat[];
};

export type PersonCalendarWeekStat = {
  weekStart: string;
  hours: number;
  maxDailyHours: number;
  weeklyWarn: boolean;
  weeklyOvertime: boolean;
  dailyWarn: boolean;
  dailyBlock: boolean;
  restCount: number;
  warnings: string[];
};

export type MonthOverview = {
  month: string;
  days: Array<{
    date: string;
    staffCount: number;
  }>;
};

export type OverviewDayLocation = {
  location: ScheduleLocationOption;
  people: Array<{
    userId: string;
    name: string;
    email: string;
    shifts: WeekShift[];
  }>;
};

export type OverviewDay = {
  date: string;
  locations: OverviewDayLocation[];
};

export type LocationMovePreview = {
  canSave: boolean;
  weeklyHoursAfter: number;
  blockingShifts: Array<{
    shiftId: string;
    locationName: string;
    startsAt: Date;
    hours: number;
  }>;
  warnings: string[];
};

export type StaffCandidate = {
  userId: string;
  name: string;
  email: string;
  eligible: boolean;
  failures: ConstraintFailure[];
  warnings: ConstraintWarning[];
};

export type AssignStaffResult =
  | { ok: true; warnings: ConstraintWarning[] }
  | {
      ok: false;
      failures: ConstraintFailure[];
      suggestions: Array<{ userId: string; name: string }>;
    };

export type MyScheduleShift = WeekShift & {
  published: boolean;
};
