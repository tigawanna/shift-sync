import { getDb } from "@/lib/drizzle/client";
import { user } from "@/lib/drizzle/schema";
import { createServerFn } from "@tanstack/react-start";
import { and, eq, like } from "drizzle-orm";
import z from "zod";

export const listStaff = createServerFn()
  .validator(
    z.object({
      page: z.number().optional().default(1),
      perPage: z.number().optional().default(50),
      sq: z.string().optional().default(''),
    }),
  )
  .handler(async ({ data: { page, perPage, sq } }) => {
    const db = await getDb();
    const staff = await db.query.user.findMany({
      where: and(eq(user.role, "staff"), like(user.name, `%${sq}%`)),
      offset: (page - 1) * perPage,
      limit: perPage,
    });
    return staff;
  });
