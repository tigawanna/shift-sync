import { ADMIN_LIST_PER_PAGE } from "@/components/pagination/constants";
import type { AppRole } from "@/lib/better-auth/permissions";
import { ROLE } from "@/lib/better-auth/permissions";
import { user as userTable } from "@/lib/drizzle/schema/auth-schema";
import { z } from "zod";

/** Roles admins can assign when creating team accounts (excludes corporate admin). */
export type TeamMemberRole = Exclude<AppRole, typeof ROLE.admin>;

export const TEAM_MEMBER_ROLES = [ROLE.manager, ROLE.staff] as const satisfies readonly TeamMemberRole[];

export const listTeamMembersInputSchema = z.object({
  page: z.number().int().min(1).optional(),
  search: z.string().optional(),
});

export const createTeamUserInputSchema = z.object({
  name: z.string().trim().min(2),
  email: z.email(),
  password: z.string().min(8),
  role: z.enum(TEAM_MEMBER_ROLES),
});

export type ListTeamMembersInput = z.infer<typeof listTeamMembersInputSchema>;
export type CreateTeamUserInput = z.infer<typeof createTeamUserInputSchema>;

type UserRow = typeof userTable.$inferSelect;

export type TeamMember = Pick<UserRow, "id" | "name" | "email" | "createdAt"> & {
  role: AppRole;
  banned: NonNullable<UserRow["banned"]>;
};

export type TeamMembersPage = {
  members: TeamMember[];
  total: number;
  page: number;
  perPage: typeof ADMIN_LIST_PER_PAGE;
  totalPages: number;
};
