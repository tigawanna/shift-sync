import { ROLE } from "../../src/lib/better-auth/roles";
import type { AppRole } from "../../src/lib/better-auth/permissions";

export const SEED_DEFAULT_PASSWORD = "CoastalEats!seed";

export type SeedUser = {
  name: string;
  email: string;
  role: AppRole;
};

/** Demo accounts for Coastal Eats — safe to reset with `pnpm db:seed`. */
export const SEED_USERS: SeedUser[] = [
  { name: "Ava Chen", email: "admin@coastaleats.test", role: ROLE.admin },
  { name: "Marcus Reed", email: "marcus.reed@coastaleats.test", role: ROLE.manager },
  { name: "Jordan Ellis", email: "jordan.ellis@coastaleats.test", role: ROLE.manager },
  { name: "Sofia Martinez", email: "sofia.martinez@coastaleats.test", role: ROLE.staff },
  { name: "Liam O'Brien", email: "liam.obrien@coastaleats.test", role: ROLE.staff },
  { name: "Priya Nair", email: "priya.nair@coastaleats.test", role: ROLE.staff },
  { name: "Ethan Brooks", email: "ethan.brooks@coastaleats.test", role: ROLE.staff },
  { name: "Maya Johnson", email: "maya.johnson@coastaleats.test", role: ROLE.staff },
  { name: "Noah Kim", email: "noah.kim@coastaleats.test", role: ROLE.staff },
  { name: "Chloe Davis", email: "chloe.davis@coastaleats.test", role: ROLE.staff },
  { name: "Ryan Patel", email: "ryan.patel@coastaleats.test", role: ROLE.staff },
  { name: "Emma Wilson", email: "emma.wilson@coastaleats.test", role: ROLE.staff },
];
