import { ROLE } from "../../src/lib/better-auth/roles";
import type { AppRole } from "../../src/lib/better-auth/permissions";

export const SEED_DEFAULT_PASSWORD = "CoastalEats!seed";

export const SEED_MANAGER_COUNT = 8;
export const SEED_STAFF_COUNT = 200;

export type SeedUser = {
  name: string;
  email: string;
  role: AppRole;
};

export function managerEmail(index: number) {
  return `manager-${String(index).padStart(3, "0")}@costal-eats.com`;
}

export function staffEmail(index: number) {
  return `staff-${String(index).padStart(3, "0")}@costal-eats.com`;
}

export function buildSeedUsers(
  managerCount: number = SEED_MANAGER_COUNT,
  staffCount: number = SEED_STAFF_COUNT,
): SeedUser[] {
  const managers: SeedUser[] = Array.from({ length: managerCount }, (_, index) => {
    const managerNumber = index + 1;
    return {
      name: `Manager ${managerNumber}`,
      email: managerEmail(managerNumber),
      role: ROLE.manager,
    };
  });

  const staff: SeedUser[] = Array.from({ length: staffCount }, (_, index) => {
    const staffNumber = index + 1;
    return {
      name: `Staff ${staffNumber}`,
      email: staffEmail(staffNumber),
      role: ROLE.staff,
    };
  });

  return [
    { name: "Ava Chen", email: "admin@coastaleats.test", role: ROLE.admin },
    ...managers,
    ...staff,
  ];
}

/** Demo accounts for Coastal Eats — safe to reset with `pnpm db:seed`. */
export const SEED_USERS = buildSeedUsers();
