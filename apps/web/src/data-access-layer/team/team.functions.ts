import { ADMIN_LIST_PER_PAGE } from "@/components/pagination/constants";
import { getAuth } from "@/lib/auth";
import { ROLE } from "@/lib/better-auth/roles";
import { parseAppRole } from "@/lib/better-auth/roles";
import { user as userTable } from "@/lib/drizzle/schema/auth-schema";
import { getDb } from "@/lib/drizzle/client";
import { location as locationTable, userLocation } from "@/lib/drizzle/schema/locations-schema";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { and, asc, count, desc, eq, exists, inArray, like, or, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { computeLocationMovePreview } from "../schedule/schedule.move-preview";
import { requireSessionRoles } from "./team.auth";
import { mondayOfWeekContaining } from "@/lib/time/zoned";
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

/** Maps a Better Auth user row into the team-directory shape. */
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

/** Drizzle ORDER BY for the team directory columns. */
function buildOrderBy(sortBy: TeamMemberSortBy, sortDirection: SortDirection) {
  const column = {
    name: userTable.name,
    email: userTable.email,
    role: userTable.role,
    createdAt: userTable.createdAt,
  }[sortBy];
  return sortDirection === "asc" ? asc(column) : desc(column);
}

/** Name/email LIKE filter for the team directory. */
function buildSearchFilter(search: string | undefined): SQL | undefined {
  const trimmed = search?.trim();
  if (!trimmed) return undefined;

  const pattern = `%${trimmed}%`;
  return or(like(userTable.name, pattern), like(userTable.email, pattern));
}

/** Pages users the viewer may see: admins by role, managers only staff at their locations. */
async function listMembersForViewer(
  input: ListTeamMembersInput,
  viewerRole: typeof ROLE.admin | typeof ROLE.manager,
  viewerId: string,
) {
  const page = input.page ?? 1;
  const perPage = ADMIN_LIST_PER_PAGE;
  const offset = (page - 1) * perPage;

  const roleFilter =
    viewerRole === ROLE.manager
      ? eq(userTable.role, ROLE.staff)
      : input.role
        ? eq(userTable.role, input.role)
        : or(eq(userTable.role, ROLE.manager), eq(userTable.role, ROLE.staff));

  const searchFilter = buildSearchFilter(input.search);
  const db = await getDb();
  const managerLoc = alias(userLocation, "manager_loc");
  const staffLoc = alias(userLocation, "staff_loc");

  // Managers only see staff who share at least one location assignment.
  const locationScope =
    viewerRole === ROLE.admin
      ? undefined
      : exists(
          db
            .select({ id: staffLoc.id })
            .from(staffLoc)
            .where(
              and(
                eq(staffLoc.userId, userTable.id),
                exists(
                  db
                    .select({ id: managerLoc.id })
                    .from(managerLoc)
                    .where(
                      and(
                        eq(managerLoc.userId, viewerId),
                        eq(managerLoc.locationId, staffLoc.locationId),
                      ),
                    ),
                ),
              ),
            ),
        );

  const sortBy = input.sortBy ?? DEFAULT_TEAM_MEMBER_SORT_BY;
  const sortDirection = input.sortDirection ?? DEFAULT_TEAM_MEMBER_SORT_DIRECTION;
  const where = and(roleFilter, searchFilter, locationScope);

  const [rows, totalRow] = await Promise.all([
    db
      .select()
      .from(userTable)
      .where(where)
      .orderBy(buildOrderBy(sortBy, sortDirection))
      .limit(perPage)
      .offset(offset),
    // Matching count so pagination knows the full result size.
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

/** Lists managers/staff for the signed-in admin or manager. */
export const listTeamMembers = createServerFn({ method: "GET" })
  .validator((data: ListTeamMembersInput) => listTeamMembersInputSchema.parse(data))
  .handler(async ({ data }) => {
    const { session, role } = await requireSessionRoles([ROLE.admin, ROLE.manager]);
    return listMembersForViewer(
      data,
      role === ROLE.admin ? ROLE.admin : ROLE.manager,
      session.user.id,
    );
  });

/** Admin-only: creates a manager or staff account via Better Auth. */
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

/** Loads a manager/staff user and the restaurants they are assigned to. */
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

  // Restaurants this person is assigned to, for the detail panel.
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

/** Returns one team member; managers can only open staff at their locations. */
export const getTeamMember = createServerFn({ method: "GET" })
  .validator((data: GetTeamMemberInput) => getTeamMemberInputSchema.parse(data))
  .handler(async ({ data }) => {
    const { session, role } = await requireSessionRoles([ROLE.admin, ROLE.manager]);
    const detail = await getTeamMemberDetail(data.userId);
    if (data.role && detail.role !== data.role) {
      throw new Error("User not found.");
    }
    if (role === ROLE.manager) {
      const db = await getDb();
      const staffLoc = alias(userLocation, "staff_loc");
      const managerLoc = alias(userLocation, "manager_loc");
      const [row] = await db
        .select({ id: staffLoc.id })
        .from(staffLoc)
        .where(
          and(
            eq(staffLoc.userId, data.userId),
            // Staff must share a location with the viewing manager.
            exists(
              db
                .select({ id: managerLoc.id })
                .from(managerLoc)
                .where(
                  and(
                    eq(managerLoc.userId, session.user.id),
                    eq(managerLoc.locationId, staffLoc.locationId),
                  ),
                ),
            ),
          ),
        )
        .limit(1);
      if (!row) {
        throw new Error("You can only view people who work at your locations.");
      }
    }
    return detail;
  });

/** Replaces a person's location assignments after blocking-shift preview. */
export const updateTeamMemberLocations = createServerFn({ method: "POST" })
  .validator((data: UpdateTeamMemberLocationsInput) =>
    updateTeamMemberLocationsInputSchema.parse(data),
  )
  .handler(async ({ data }) => {
    const { session, role } = await requireSessionRoles([ROLE.admin, ROLE.manager]);

    const db = await getDb();
    const uniqueLocationIds = [...new Set(data.locationIds)];

    if (role === ROLE.manager) {
      const managed = await db
        .select({ locationId: userLocation.locationId })
        .from(userLocation)
        .where(eq(userLocation.userId, session.user.id));
      const managedIds = new Set(managed.map((row) => row.locationId));
      const current = await db
        .select({ locationId: userLocation.locationId })
        .from(userLocation)
        .where(eq(userLocation.userId, data.userId));
      const currentIds = new Set(current.map((row) => row.locationId));
      for (const locationId of uniqueLocationIds) {
        if (!managedIds.has(locationId) && !currentIds.has(locationId)) {
          throw new Error("You can only assign staff to locations you manage.");
        }
      }
    }

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

    const weekStart = mondayOfWeekContaining(new Date(), "UTC");
    const preview = await computeLocationMovePreview({
      userId: data.userId,
      locationIds: uniqueLocationIds,
      weekStart,
      role,
      viewerId: session.user.id,
    });
    if (!preview.canSave) {
      const first = preview.blockingShifts[0];
      throw new Error(
        first
          ? `Cannot remove a location while they still have upcoming shifts (next: ${first.locationName}). Reassign those shifts first.`
          : "Cannot change locations while upcoming shifts would be left uncovered.",
      );
    }

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
