import {
  managerEmail,
  SEED_MANAGER_COUNT,
  SEED_STAFF_COUNT,
  staffEmail,
} from "./users.data";

export type SeedLocation = {
  id: string;
  name: string;
  timezone: string;
  address: string;
};

/** Four Coastal Eats locations across Pacific and Eastern time zones. */
export const SEED_LOCATIONS: SeedLocation[] = [
  {
    id: "loc-harbor-house",
    name: "Harbor House",
    timezone: "America/Los_Angeles",
    address: "1200 Ocean Ave, Santa Monica, CA",
  },
  {
    id: "loc-pier-bistro",
    name: "Pier 39 Bistro",
    timezone: "America/Los_Angeles",
    address: "Pier 39, San Francisco, CA",
  },
  {
    id: "loc-atlantic-table",
    name: "Atlantic Table",
    timezone: "America/New_York",
    address: "880 Ocean Dr, Miami Beach, FL",
  },
  {
    id: "loc-harbor-light",
    name: "Harbor Light",
    timezone: "America/New_York",
    address: "42 Market St, Charleston, SC",
  },
];

const LOCATION_IDS = SEED_LOCATIONS.map((location) => location.id);

/** Deterministic PRNG so seed assignments are stable across runs. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickRandomLocations(seed: number, count: number): string[] {
  const random = mulberry32(seed);
  const shuffled = [...LOCATION_IDS];

  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled.slice(0, Math.min(count, shuffled.length));
}

export function buildSeedUserLocations(
  managerCount: number = SEED_MANAGER_COUNT,
  staffCount: number = SEED_STAFF_COUNT,
): Record<string, string[]> {
  const assignments: Record<string, string[]> = {};

  for (let i = 1; i <= managerCount; i += 1) {
    assignments[managerEmail(i)] = pickRandomLocations(i, 2);
  }

  for (let i = 1; i <= staffCount; i += 1) {
    const locationCount = i % 3 === 0 ? 2 : 1;
    assignments[staffEmail(i)] = pickRandomLocations(i + 100, locationCount);
  }

  return assignments;
}

/** Maps user email → location ids (managers run locations, staff are certified). */
export const SEED_USER_LOCATIONS = buildSeedUserLocations();
