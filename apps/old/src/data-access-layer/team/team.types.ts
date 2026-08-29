import { ADMIN_LIST_PER_PAGE } from "@/components/pagination/constants";
import type { AppRole } from "@/lib/better-auth/permissions";
import { ROLE } from "@/lib/better-auth/permissions";
import { user as userTable } from "@/lib/drizzle/schema/auth-schema";
import { z } from "zod";
import type {
  StaffAvailabilityException,
  StaffSkill,
  StaffWeeklyWindow,
} from "../staff-profile/staff-profile.types";

/** Roles admins can assign when creating team accounts (excludes corporate admin). */
export type TeamMemberRole = Exclude<AppRole, typeof ROLE.admin>;

export const TEAM_MEMBER_ROLES = [
  ROLE.manager,
  ROLE.staff,
] as const satisfies readonly TeamMemberRole[];

export const TEAM_MEMBER_SORT_KEYS = ["name", "email", "role", "createdAt"] as const;
export type TeamMemberSortBy = (typeof TEAM_MEMBER_SORT_KEYS)[number];

export const SORT_DIRECTIONS = ["asc", "desc"] as const;
export type SortDirection = (typeof SORT_DIRECTIONS)[number];

export const DEFAULT_TEAM_MEMBER_SORT_BY = "createdAt" satisfies TeamMemberSortBy;
export const DEFAULT_TEAM_MEMBER_SORT_DIRECTION = "desc" satisfies SortDirection;

export const listTeamMembersInputSchema = z.object({
  page: z.number().int().min(1).optional(),
  search: z.string().optional(),
  role: z.enum(TEAM_MEMBER_ROLES).optional(),
  sortBy: z.enum(TEAM_MEMBER_SORT_KEYS).optional(),
  sortDirection: z.enum(SORT_DIRECTIONS).optional(),
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

export type TeamMemberLocation = {
  id: string;
  name: string;
  timezone: string;
  address: string | null;
};

export type TeamMemberDetail = TeamMember & {
  locations: TeamMemberLocation[];
  skills: StaffSkill[];
  weeklyWindows: StaffWeeklyWindow[];
  exceptions: StaffAvailabilityException[];
};

export const getTeamMemberInputSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(TEAM_MEMBER_ROLES).optional(),
});

export const updateTeamMemberLocationsInputSchema = z.object({
  userId: z.string().min(1),
  locationIds: z.array(z.string().min(1)),
});

export type GetTeamMemberInput = z.infer<typeof getTeamMemberInputSchema>;
export type UpdateTeamMemberLocationsInput = z.infer<typeof updateTeamMemberLocationsInputSchema>;
