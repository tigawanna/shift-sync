import { ADMIN_LIST_PER_PAGE } from "@/components/pagination/constants";
import { ROLE } from "@/lib/better-auth/roles";
import { getDb } from "@/lib/drizzle/client";
import { location as locationTable, userLocation } from "@/lib/drizzle/schema/locations-schema";
import { createServerFn } from "@tanstack/react-start";
import { and, asc, count, eq, exists, like, or, sql, type SQL } from "drizzle-orm";
import { requireSessionRoles } from "../team/team.auth";
import {
  createLocationInputSchema,
  listLocationsInputSchema,
  updateLocationInputSchema,
  type CreateLocationInput,
  type ListLocationsInput,
  type LocationRecord,
  type UpdateLocationInput,
} from "./location.types";

type LocationsPage = {
  locations: LocationRecord[];
  total: number;
  page: number;
  perPage: typeof ADMIN_LIST_PER_PAGE;
  totalPages: number;
};

/** Name/address LIKE filter for location lists. */
function buildSearchFilter(search: string | undefined): SQL | undefined {
  const trimmed = search?.trim();
  if (!trimmed) return undefined;

  const pattern = `%${trimmed}%`;
  return or(like(locationTable.name, pattern), like(locationTable.address, pattern));
}

type LocationWithAssignments = {
  id: string;
  name: string;
  timezone: string;
  address: string | null;
  createdAt: Date;
  userLocations: Array<{ user: { role: string | null } | null }>;
};

function countAssignments(userLocations: LocationWithAssignments["userLocations"]) {
  let managerCount = 0;
  let staffCount = 0;

  for (const assignment of userLocations) {
    if (assignment.user?.role === ROLE.manager) {
      managerCount += 1;
    } else if (assignment.user?.role === ROLE.staff) {
      staffCount += 1;
    }
  }

  return { managerCount, staffCount };
}

function mapLocation(row: LocationWithAssignments): LocationRecord {
  const { managerCount, staffCount } = countAssignments(row.userLocations);

  return {
    id: row.id,
    name: row.name,
    timezone: row.timezone,
    address: row.address ?? null,
    createdAt: row.createdAt,
    managerCount,
    staffCount,
  };
}

/** Nested `with` so each location loads assigned users for manager/staff counts. */
const locationWithAssignments = {
  userLocations: {
    with: {
      user: true,
    },
  },
} as const;

/** One location plus its userLocation → user relations. */
async function findLocationWithAssignments(locationId: string) {
  const db = await getDb();
  return db.query.location.findFirst({
    where: (location, { eq }) => eq(location.id, locationId),
    with: locationWithAssignments,
  });
}

/** Admin directory: every restaurant, paginated, with assignment counts. */
async function listAllLocations(input: ListLocationsInput): Promise<LocationsPage> {
  const page = input.page ?? 1;
  const perPage = ADMIN_LIST_PER_PAGE;
  const offset = (page - 1) * perPage;
  const searchFilter = buildSearchFilter(input.search);
  const db = await getDb();

  const trimmedSearch = input.search?.trim();
  const searchPattern = trimmedSearch ? `%${trimmedSearch}%` : undefined;

  const [rows, totalRow] = await Promise.all([
    db.query.location.findMany({
      where: searchPattern
        ? (location, { or, like }) =>
            or(like(location.name, searchPattern), like(location.address, searchPattern))
        : undefined,
      with: locationWithAssignments,
      orderBy: (location, { desc }) => [desc(location.createdAt)],
      limit: perPage,
      offset,
    }),
    db.select({ total: count() }).from(locationTable).where(searchFilter),
  ]);

  const total = totalRow[0]?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  return {
    locations: rows.map(mapLocation),
    total,
    page,
    perPage,
    totalPages,
  };
}

/** Manager directory: only restaurants this manager is assigned to. */
async function listManagerLocations(
  managerId: string,
  input: ListLocationsInput,
): Promise<LocationsPage> {
  const page = input.page ?? 1;
  const perPage = ADMIN_LIST_PER_PAGE;
  const offset = (page - 1) * perPage;
  const searchFilter = buildSearchFilter(input.search);
  const db = await getDb();

  const trimmedSearch = input.search?.trim();
  const searchPattern = trimmedSearch ? `%${trimmedSearch}%` : undefined;
  const managerAssignmentFilter = eq(userLocation.userId, managerId);

  const [rows, totalRow] = await Promise.all([
    db.query.location.findMany({
      where: (location, { and, or, like, eq }) => {
        const managerFilter = exists(
          db
            .select({ id: userLocation.id })
            .from(userLocation)
            .where(and(eq(userLocation.locationId, location.id), managerAssignmentFilter)),
        );

        if (!searchPattern) {
          return managerFilter;
        }

        return and(
          or(like(location.name, searchPattern), like(location.address, searchPattern)),
          managerFilter,
        );
      },
      with: locationWithAssignments,
      orderBy: (location, { desc }) => [desc(location.createdAt)],
      limit: perPage,
      offset,
    }),
    db
      .select({ total: count() })
      .from(locationTable)
      .innerJoin(userLocation, eq(userLocation.locationId, locationTable.id))
      .where(searchFilter ? and(managerAssignmentFilter, searchFilter) : managerAssignmentFilter),
  ]);

  const total = totalRow[0]?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  return {
    locations: rows.map(mapLocation),
    total,
    page,
    perPage,
    totalPages,
  };
}

/** Lists locations for the signed-in admin (all) or manager (assigned). */
export const listLocations = createServerFn({ method: "GET" })
  .validator((data: ListLocationsInput) => listLocationsInputSchema.parse(data))
  .handler(async ({ data }) => {
    const { session, role } = await requireSessionRoles([ROLE.admin, ROLE.manager]);

    if (role === ROLE.admin) {
      return listAllLocations(data);
    }

    return listManagerLocations(session.user.id, data);
  });

/** Admin-only: inserts a restaurant row. */
export const createLocation = createServerFn({ method: "POST" })
  .validator((data: CreateLocationInput) => createLocationInputSchema.parse(data))
  .handler(async ({ data }) => {
    await requireSessionRoles([ROLE.admin]);

    const db = await getDb();
    const id = crypto.randomUUID();

    const [row] = await db
      .insert(locationTable)
      .values({
        id,
        name: data.name,
        timezone: data.timezone,
        address: data.address?.trim() || null,
      })
      .returning();

    if (!row) {
      throw new Error("Could not create location.");
    }

    return mapLocation({ ...row, userLocations: [] });
  });

/** Admin-only: patches name, timezone, or address. */
export const updateLocation = createServerFn({ method: "POST" })
  .validator((data: UpdateLocationInput) => updateLocationInputSchema.parse(data))
  .handler(async ({ data }) => {
    await requireSessionRoles([ROLE.admin]);

    const db = await getDb();
    const updates: Partial<typeof locationTable.$inferInsert> = {};

    if (data.name !== undefined) updates.name = data.name;
    if (data.timezone !== undefined) updates.timezone = data.timezone;
    if (data.address !== undefined) updates.address = data.address.trim() || null;

    if (Object.keys(updates).length === 0) {
      throw new Error("No updates provided.");
    }

    const [row] = await db
      .update(locationTable)
      .set(updates)
      .where(eq(locationTable.id, data.id))
      .returning();

    if (!row) {
      throw new Error("Location not found.");
    }

    const withAssignments = await findLocationWithAssignments(row.id);
    if (!withAssignments) {
      throw new Error("Location not found.");
    }

    return mapLocation(withAssignments);
  });

/** Distinct timezones already used by restaurants. */
export const listLocationTimezones = createServerFn({ method: "GET" }).handler(async () => {
  await requireSessionRoles([ROLE.admin, ROLE.manager]);

  const db = await getDb();
  const rows = await db
    .selectDistinct({ timezone: locationTable.timezone })
    .from(locationTable)
    .orderBy(locationTable.timezone);

  return rows.map((row) => row.timezone);
});

/** Location picker for assigning people: all restaurants for admin, assigned ones for manager. */
export const listAllLocationsForAssignment = createServerFn({ method: "GET" }).handler(async () => {
  const { session, role } = await requireSessionRoles([ROLE.admin, ROLE.manager]);
  const db = await getDb();

  if (role === ROLE.admin) {
    return db.query.location.findMany({
      orderBy: (location, { asc }) => [asc(location.name)],
      columns: {
        id: true,
        name: true,
        timezone: true,
        address: true,
      },
    });
  }

  return db
    .select({
      id: locationTable.id,
      name: locationTable.name,
      timezone: locationTable.timezone,
      address: locationTable.address,
    })
    .from(locationTable)
    .innerJoin(userLocation, eq(userLocation.locationId, locationTable.id))
    .where(eq(userLocation.userId, session.user.id))
    .orderBy(asc(locationTable.name));
});

/** Locations the viewer may schedule: all for admin, assigned for manager. */
export const listAccessibleLocations = createServerFn({ method: "GET" }).handler(async () => {
  const { session, role } = await requireSessionRoles([ROLE.admin, ROLE.manager]);
  const db = await getDb();

  if (role === ROLE.admin) {
    return db.query.location.findMany({
      orderBy: (location, { asc }) => [asc(location.name)],
      columns: { id: true, name: true, timezone: true, address: true },
    });
  }

  return db
    .select({
      id: locationTable.id,
      name: locationTable.name,
      timezone: locationTable.timezone,
      address: locationTable.address,
    })
    .from(locationTable)
    .innerJoin(userLocation, eq(userLocation.locationId, locationTable.id))
    .where(eq(userLocation.userId, session.user.id))
    .orderBy(asc(locationTable.name));
});

/** Counts restaurants (and distinct timezones) in the viewer's scope. */
export const getLocationSummary = createServerFn({ method: "GET" }).handler(async () => {
  const { session, role } = await requireSessionRoles([ROLE.admin, ROLE.manager]);
  const db = await getDb();

  if (role === ROLE.admin) {
    const [row] = await db.select({ total: count() }).from(locationTable);
    const [timezoneRow] = await db
      .select({ total: sql<number>`count(distinct ${locationTable.timezone})` })
      .from(locationTable);

    return {
      totalLocations: row?.total ?? 0,
      timezoneCount: timezoneRow?.total ?? 0,
    };
  }

  const [row] = await db
    .select({ total: count() })
    .from(userLocation)
    .where(eq(userLocation.userId, session.user.id));

  const [timezoneRow] = await db
    .select({ total: sql<number>`count(distinct ${locationTable.timezone})` })
    .from(locationTable)
    .innerJoin(userLocation, eq(userLocation.locationId, locationTable.id))
    .where(eq(userLocation.userId, session.user.id));

  return {
    totalLocations: row?.total ?? 0,
    timezoneCount: timezoneRow?.total ?? 0,
  };
});
