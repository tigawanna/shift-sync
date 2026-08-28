import { location as locationTable } from "@/lib/drizzle/schema/locations-schema";
import { z } from "zod";

export const listLocationsInputSchema = z.object({
  page: z.number().int().min(1).optional(),
  search: z.string().optional(),
});

export const createLocationInputSchema = z.object({
  name: z.string().trim().min(2),
  timezone: z.string().trim().min(1),
  address: z.string().trim().optional(),
});

export const updateLocationInputSchema = createLocationInputSchema.partial().extend({
  id: z.string().min(1),
});

export type ListLocationsInput = z.infer<typeof listLocationsInputSchema>;
export type CreateLocationInput = z.infer<typeof createLocationInputSchema>;
export type UpdateLocationInput = z.infer<typeof updateLocationInputSchema>;

type LocationRow = typeof locationTable.$inferSelect;

export type LocationRecord = Pick<
  LocationRow,
  "id" | "name" | "timezone" | "address" | "createdAt"
> & {
  managerCount: number;
  staffCount: number;
};
