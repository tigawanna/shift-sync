import {
  AVAILABILITY_EXCEPTION_KINDS,
  type AvailabilityExceptionKind,
} from "@/lib/schedule/availability";
import { SKILL_IDS } from "@/lib/schedule/skills";
import { z } from "zod";

export const civilDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const minuteSchema = z.number().int().min(0).max(24 * 60);

export const weeklyWindowInputSchema = z
  .object({
    weekday: z.number().int().min(0).max(6),
    startMinute: minuteSchema,
    endMinute: minuteSchema,
  })
  .refine((window) => window.startMinute < window.endMinute, {
    message: "Each window must end after it starts.",
  });

export const replaceMyAvailabilityInputSchema = z.object({
  windows: z.array(weeklyWindowInputSchema),
});

export const addAvailabilityExceptionInputSchema = z
  .object({
    date: civilDateSchema,
    kind: z.enum(AVAILABILITY_EXCEPTION_KINDS),
    startMinute: minuteSchema,
    endMinute: minuteSchema,
    note: z.string().trim().max(160).optional(),
  })
  .refine((exception) => exception.startMinute < exception.endMinute, {
    message: "The exception must end after it starts.",
  });

export const removeAvailabilityExceptionInputSchema = z.object({
  exceptionId: z.string().min(1),
});

export type WeeklyWindowInput = z.infer<typeof weeklyWindowInputSchema>;
export type ReplaceMyAvailabilityInput = z.infer<typeof replaceMyAvailabilityInputSchema>;
export type AddAvailabilityExceptionInput = z.infer<typeof addAvailabilityExceptionInputSchema>;

export type StaffSkill = {
  id: string;
  name: string;
};

export type StaffWeeklyWindow = WeeklyWindowInput & {
  id: string;
};

export type StaffAvailabilityException = {
  id: string;
  date: string;
  kind: AvailabilityExceptionKind;
  startMinute: number;
  endMinute: number;
  note: string | null;
};

export type StaffLocation = {
  id: string;
  name: string;
  timezone: string;
  address: string | null;
};

export type StaffProfile = {
  userId: string;
  name: string;
  email: string;
  locations: StaffLocation[];
  skills: StaffSkill[];
  weeklyWindows: StaffWeeklyWindow[];
  exceptions: StaffAvailabilityException[];
};

export const updateTeamMemberSkillsInputSchema = z.object({
  userId: z.string().min(1),
  skillIds: z.array(z.enum(SKILL_IDS)),
});

export type UpdateTeamMemberSkillsInput = z.infer<typeof updateTeamMemberSkillsInputSchema>;
