import { createAccessControl } from "better-auth/plugins/access";
import { adminAc, defaultStatements, userAc } from "better-auth/plugins/admin/access";

const statement = { ...defaultStatements } as const;

export const ac = createAccessControl(statement);

/** Corporate admin — full user management via the Better Auth admin API. */
export const adminRole = ac.newRole({ ...adminAc.statements });

/** Manager — scheduling workflows; can impersonate staff for support. */
export const managerRole = ac.newRole({
  ...userAc.statements,
  user: ["impersonate"],
});

/** Staff — self-service shifts, swaps, and availability only. */
export const staffRole = ac.newRole({ ...userAc.statements });

export const ROLE = {
  admin: "admin",
  manager: "manager",
  staff: "staff",
} as const;

export type AppRole = keyof typeof ROLE;

export const roles = {
  [ROLE.admin]: adminRole,
  [ROLE.manager]: managerRole,
  [ROLE.staff]: staffRole,
} as const;
