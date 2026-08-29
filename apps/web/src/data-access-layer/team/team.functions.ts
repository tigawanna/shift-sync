import { ADMIN_LIST_PER_PAGE } from "@/components/pagination/constants";
import { getAuth } from "@/lib/auth";
import { ROLE } from "@/lib/better-auth/roles";
import { parseAppRole } from "@/lib/better-auth/roles";
import { user as userTable } from "@/lib/drizzle/schema/auth-schema";
import { getDb } from "@/lib/drizzle/client";
import { location as locationTable, userLocation } from "@/lib/drizzle/schema/locations-schema";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { and, asc, count, desc, eq, inArray, like, or, type SQL } from "drizzle-orm";
import { requireSessionRoles } from "./team.auth";
import {
  createTeamUserInputSchema,
  getTeamMemberInputSchema,
  listTeamMembersInputSchema,
  updateTeamMemberLocationsInputSchema,
  type CreateTeamUserInput,
  DEFAULT_TEAM_MEMBER_SORT_BY,
  DEFAULT_TEAM_MEMBER_SORT_DIRECTION,
  type GetTeamMemberInput,
  type ListTeamMembersInput,
  type TeamMember,
  type TeamMemberDetail,
  type TeamMemberSortBy,
  type SortDirection,
  type TeamMembersPage,
  type UpdateTeamMemberLocationsInput,
} from "./team.types";

function mapTeamMember(row: typeof userTable.$inferSelect): TeamMember {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: parseAppRole(row.role),
    createdAt: row.createdAt,
    banned: row.banned ?? false,
  };
}

function buildOrderBy(sortBy: TeamMemberSortBy, sortDirection: SortDirection) {
  const column = {
    name: userTable.name,
    email: userTable.email,
    role: userTable.role,
    createdAt: userTable.createdAt,
  }[sortBy];
  return sortDirection === "asc" ? asc(column) : desc(column);
}

function buildSearchFilter(search: string | undefined): SQL | undefined {
  const trimmed = search?.trim();
  if (!trimmed) return undefined;

  const pattern = `%${trimmed}%`;
  return or(like(userTable.name, pattern), like(userTable.email, pattern));
}

async function listMembersForViewer(
  input: ListTeamMembersInput,
  viewerRole: typeof ROLE.admin | typeof ROLE.manager,
) {
  const page = input.page ?? 1;
  const perPage = ADMIN_LIST_PER_PAGE;
  const offset = (page - 1) * perPage;

  const roleFilter =
    viewerRole === ROLE.admin
      ? or(eq(userTable.role, ROLE.manager), eq(userTable.role, ROLE.staff))
      : eq(userTable.role, ROLE.staff);

  const searchFilter = buildSearchFilter(input.search);
  const where = searchFilter ? and(roleFilter, searchFilter) : roleFilter;
  const sortBy = input.sortBy ?? DEFAULT_TEAM_MEMBER_SORT_BY;
  const sortDirection = input.sortDirection ?? DEFAULT_TEAM_MEMBER_SORT_DIRECTION;

  const db = await getDb();

  const [rows, totalRow] = await Promise.all([
    db
      .select()
      .from(userTable)
      .where(where)
      .orderBy(buildOrderBy(sortBy, sortDirection))
      .limit(perPage)
      .offset(offset),
    db.select({ total: count() }).from(userTable).where(where),
  ]);

  const total = totalRow[0]?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  return {
    members: rows.map(mapTeamMember),
    total,
    page,
    perPage,
    totalPages,
  } satisfies TeamMembersPage;
}

export const listTeamMembers = createServerFn({ method: "GET" })
  .validator((data: ListTeamMembersInput) => listTeamMembersInputSchema.parse(data))
  .handler(async ({ data }) => {
    const { role } = await requireSessionRoles([ROLE.admin, ROLE.manager]);
    return listMembersForViewer(data, role === ROLE.admin ? ROLE.admin : ROLE.manager);
  });

export const createTeamUser = createServerFn({ method: "POST" })
  .validator((data: CreateTeamUserInput) => createTeamUserInputSchema.parse(data))
  .handler(async ({ data }) => {
    await requireSessionRoles([ROLE.admin]);

    const headers = getRequestHeaders();
    const auth = await getAuth();

    const result = await auth.api.createUser({
      headers,
      body: {
        name: data.name,
        email: data.email,
        password: data.password,
        role: data.role,
      },
    });

    if (!result?.user) {
      throw new Error("Could not create user.");
    }

    return mapTeamMember({
      id: result.user.id,
      name: result.user.name,
      email: result.user.email,
      emailVerified: result.user.emailVerified,
      image: result.user.image ?? null,
      createdAt: result.user.createdAt,
      updatedAt: result.user.updatedAt,
      role: result.user.role ?? data.role,
      banned: result.user.banned ?? false,
      banReason: result.user.banReason ?? null,
      banExpires: result.user.banExpires ?? null,
    });
  });

async function getTeamMemberDetail(userId: string): Promise<TeamMemberDetail> {
  const db = await getDb();

  const [userRow] = await db.select().from(userTable).where(eq(userTable.id, userId)).limit(1);

  if (!userRow) {
    throw new Error("User not found.");
  }

  const role = parseAppRole(userRow.role);
  if (role !== ROLE.manager && role !== ROLE.staff) {
    throw new Error("Only managers and staff can be managed here.");
  }

  const locationRows = await db
    .select({
      id: locationTable.id,
      name: locationTable.name,
      timezone: locationTable.timezone,
      address: locationTable.address,
    })
    .from(userLocation)
    .innerJoin(locationTable, eq(userLocation.locationId, locationTable.id))
    .where(eq(userLocation.userId, userId))
    .orderBy(asc(locationTable.name));

  return {
    ...mapTeamMember(userRow),
    locations: locationRows.map((row) => ({
      id: row.id,
      name: row.name,
      timezone: row.timezone,
      address: row.address ?? null,
    })),
  };
}

export const getTeamMember = createServerFn({ method: "GET" })
  .validator((data: GetTeamMemberInput) => getTeamMemberInputSchema.parse(data))
  .handler(async ({ data }) => {
    await requireSessionRoles([ROLE.admin]);
    return getTeamMemberDetail(data.userId);
  });

export const updateTeamMemberLocations = createServerFn({ method: "POST" })
  .validator((data: UpdateTeamMemberLocationsInput) =>
    updateTeamMemberLocationsInputSchema.parse(data),
  )
  .handler(async ({ data }) => {
    await requireSessionRoles([ROLE.admin]);

    const db = await getDb();
    const uniqueLocationIds = [...new Set(data.locationIds)];

    if (uniqueLocationIds.length > 0) {
      const existingLocations = await db
        .select({ id: locationTable.id })
        .from(locationTable)
        .where(inArray(locationTable.id, uniqueLocationIds));

      if (existingLocations.length !== uniqueLocationIds.length) {
        throw new Error("One or more locations were not found.");
      }
    }

    await getTeamMemberDetail(data.userId);

    await db.delete(userLocation).where(eq(userLocation.userId, data.userId));

    if (uniqueLocationIds.length > 0) {
      await db.insert(userLocation).values(
        uniqueLocationIds.map((locationId) => ({
          id: crypto.randomUUID(),
          userId: data.userId,
          locationId,
        })),
      );
    }

    return getTeamMemberDetail(data.userId);
  });
