import { requireSessionRoles } from "@/data-access-layer/auth/roles";
import { ROLE } from "@/lib/better-auth/roles";
import { AVAILABILITY_EXCEPTION_KINDS } from "@/lib/schedule/availability";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  deleteAvailabilityExceptionsOnDate,
  insertAvailabilityException,
  loadStaffAvailabilityForUser,
} from "./staff-availability.server";

const monthSchema = z.string().regex(/^\d{4}-\d{2}$/, "Month must be YYYY-MM");
const civilDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const minuteSchema = z
  .number()
  .int()
  .min(0)
  .max(24 * 60);

export const listMyStaffAvailabilityInputSchema = z.object({
  month: monthSchema,
});

export const addMyAvailabilityExceptionInputSchema = z
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

export const removeMyAvailabilityExceptionsInputSchema = z.object({
  date: civilDateSchema,
  kind: z.enum(AVAILABILITY_EXCEPTION_KINDS).optional(),
});

export type ListMyStaffAvailabilityInput = z.infer<typeof listMyStaffAvailabilityInputSchema>;
export type AddMyAvailabilityExceptionInput = z.infer<typeof addMyAvailabilityExceptionInputSchema>;
export type { StaffAvailabilityException, StaffWeeklyWindow } from "./staff-availability.server";

export const listMyStaffAvailability = createServerFn({ method: "GET" })
  .validator((data: ListMyStaffAvailabilityInput) => listMyStaffAvailabilityInputSchema.parse(data))
  .handler(async ({ data }) => {
    const { session } = await requireSessionRoles([ROLE.staff]);
    return loadStaffAvailabilityForUser(data.month, session.user.id);
  });

export const addMyAvailabilityException = createServerFn({ method: "POST" })
  .validator((data: AddMyAvailabilityExceptionInput) =>
    addMyAvailabilityExceptionInputSchema.parse(data),
  )
  .handler(async ({ data }) => {
    const { session } = await requireSessionRoles([ROLE.staff]);
    await insertAvailabilityException({
      userId: session.user.id,
      userName: session.user.name,
      date: data.date,
      kind: data.kind,
      startMinute: data.startMinute,
      endMinute: data.endMinute,
      note: data.note,
    });
    return { ok: true as const };
  });

export const removeMyAvailabilityExceptionsOnDate = createServerFn({ method: "POST" })
  .validator((data: unknown) => removeMyAvailabilityExceptionsInputSchema.parse(data))
  .handler(async ({ data }) => {
    const { session } = await requireSessionRoles([ROLE.staff]);
    await deleteAvailabilityExceptionsOnDate({
      userId: session.user.id,
      date: data.date,
      kind: data.kind,
    });
    return { ok: true as const };
  });
