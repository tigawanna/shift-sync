export const COVERAGE_PENDING_LIMIT = 3;
export const DROP_EXPIRE_HOURS = 24;

export const COVERAGE_KIND = {
  swap: "swap",
  drop: "drop",
} as const;

export const COVERAGE_STATUS = {
  open: "open",
  pending_peer: "pending_peer",
  pending_manager: "pending_manager",
  approved: "approved",
  rejected: "rejected",
  withdrawn: "withdrawn",
  cancelled: "cancelled",
  expired: "expired",
} as const;

export const COVERAGE_KINDS = [COVERAGE_KIND.swap, COVERAGE_KIND.drop] as const;
export const COVERAGE_STATUSES = [
  COVERAGE_STATUS.open,
  COVERAGE_STATUS.pending_peer,
  COVERAGE_STATUS.pending_manager,
  COVERAGE_STATUS.approved,
  COVERAGE_STATUS.rejected,
  COVERAGE_STATUS.withdrawn,
  COVERAGE_STATUS.cancelled,
  COVERAGE_STATUS.expired,
] as const;

export type CoverageKind = (typeof COVERAGE_KINDS)[number];
export type CoverageStatus = (typeof COVERAGE_STATUSES)[number];

export const ACTIVE_COVERAGE_STATUSES = [
  COVERAGE_STATUS.open,
  COVERAGE_STATUS.pending_peer,
  COVERAGE_STATUS.pending_manager,
] as const;
