import { SKILLS, type SkillId } from "../../src/lib/schedule/skills";
import { staffEmail, SEED_STAFF_COUNT } from "./users.data";
import { SEED_USER_LOCATIONS } from "./locations.data";

export const SEED_SKILLS = SKILLS;

const HARBOR_HOUSE = "loc-harbor-house";

export function skillIdsForStaffIndex(index: number): SkillId[] {
  const primary = SKILLS[(index - 1) % SKILLS.length].id;
  if (index % 5 === 0) {
    const extra = SKILLS[index % SKILLS.length].id;
    return extra === primary ? [primary] : [primary, extra];
  }
  return [primary];
}

export function buildSeedUserSkills(staffCount: number = SEED_STAFF_COUNT) {
  return Array.from({ length: staffCount }, (_, offset) => {
    const index = offset + 1;
    return {
      email: staffEmail(index),
      skillIds: skillIdsForStaffIndex(index),
    };
  });
}

/** Wall-clock windows checked in the shift location timezone. Staff 001 is daytime-only. */
export function buildSeedAvailability(staffCount: number = SEED_STAFF_COUNT) {
  return Array.from({ length: staffCount }, (_, offset) => {
    const index = offset + 1;
    const daytimeOnly = index === 1;
    const windows = [
      {
        startMinute: daytimeOnly ? 9 * 60 : 10 * 60,
        endMinute: daytimeOnly ? 17 * 60 : 24 * 60,
      },
    ];
    if (!daytimeOnly) {
      windows.push({ startMinute: 0, endMinute: 4 * 60 });
    }
    return { email: staffEmail(index), windows };
  });
}

function staffIndexFromEmail(email: string) {
  const match = email.match(/staff-(\d+)/);
  return match ? Number(match[1]) : 0;
}

export function emailsWithSkill(emails: string[], skillId: SkillId) {
  return emails.filter((email) => skillIdsForStaffIndex(staffIndexFromEmail(email)).includes(skillId));
}

export function harborHouseStaffEmails() {
  return Object.entries(SEED_USER_LOCATIONS)
    .filter(([email, locationIds]) => email.startsWith("staff-") && locationIds.includes(HARBOR_HOUSE))
    .map(([email]) => email);
}

export type SeedShiftSpec = {
  id: string;
  locationId: string;
  skillId: SkillId;
  dayOffset: number;
  startTime: string;
  endTime: string;
  headcountNeeded: number;
  notes?: string;
  assigneeEmails: string[];
};

export function buildHarborHouseWeekShifts(assigneeEmails: string[]): SeedShiftSpec[] {
  const servers = emailsWithSkill(assigneeEmails, "server");
  const bartenders = emailsWithSkill(assigneeEmails, "bartender");
  const cooks = emailsWithSkill(assigneeEmails, "line_cook");
  const hosts = emailsWithSkill(assigneeEmails, "host");

  const pick = (pool: string[], count: number, offset: number) =>
    pool.slice(offset, offset + count);

  return [
    {
      id: "shift-hh-mon-dinner-server",
      locationId: HARBOR_HOUSE,
      skillId: "server",
      dayOffset: 0,
      startTime: "16:00",
      endTime: "22:00",
      headcountNeeded: 3,
      notes: "Dinner service",
      assigneeEmails: pick(servers, 2, 0),
    },
    {
      id: "shift-hh-fri-bar",
      locationId: HARBOR_HOUSE,
      skillId: "bartender",
      dayOffset: 4,
      startTime: "17:00",
      endTime: "23:00",
      headcountNeeded: 2,
      notes: "Friday bar",
      assigneeEmails: pick(bartenders, 2, 0),
    },
    {
      id: "shift-hh-sat-cook",
      locationId: HARBOR_HOUSE,
      skillId: "line_cook",
      dayOffset: 5,
      startTime: "15:00",
      endTime: "23:00",
      headcountNeeded: 3,
      notes: "Saturday line",
      assigneeEmails: pick(cooks, 2, 0),
    },
    {
      id: "shift-hh-sat-host",
      locationId: HARBOR_HOUSE,
      skillId: "host",
      dayOffset: 5,
      startTime: "16:00",
      endTime: "22:00",
      headcountNeeded: 2,
      assigneeEmails: pick(hosts, 1, 0),
    },
    {
      id: "shift-hh-sat-overnight",
      locationId: HARBOR_HOUSE,
      skillId: "bartender",
      dayOffset: 5,
      startTime: "23:00",
      endTime: "03:00",
      headcountNeeded: 1,
      notes: "Overnight close",
      assigneeEmails: pick(bartenders, 1, 2),
    },
  ];
}
