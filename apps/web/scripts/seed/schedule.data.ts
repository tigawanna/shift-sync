import { SKILLS, type SkillId } from "../../src/lib/schedule/skills";
import { addDaysYmd } from "../../src/lib/time/zoned";
import { staffEmail, SEED_STAFF_COUNT } from "./users.data";
import { SEED_LOCATIONS, SEED_USER_LOCATIONS } from "./locations.data";

export const SEED_SKILLS = SKILLS;

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

/** One-off blocked / extra windows relative to the seeded schedule's Monday. */
export function buildSeedAvailabilityExceptions(weekStart: string) {
  return [
    {
      email: staffEmail(1),
      date: addDaysYmd(weekStart, 8),
      kind: "blocked" as const,
      startMinute: 0,
      endMinute: 24 * 60,
      note: "Personal day",
    },
    {
      email: staffEmail(2),
      date: addDaysYmd(weekStart, 5),
      kind: "extra" as const,
      startMinute: 16 * 60,
      endMinute: 22 * 60,
      note: "Can cover dinner",
    },
  ];
}

function staffIndexFromEmail(email: string) {
  const match = email.match(/staff-(\d+)/);
  return match ? Number(match[1]) : 0;
}

export function emailsWithSkill(emails: string[], skillId: SkillId) {
  return emails.filter((email) =>
    skillIdsForStaffIndex(staffIndexFromEmail(email)).includes(skillId),
  );
}

export function staffEmailsAtLocation(locationId: string) {
  return Object.entries(SEED_USER_LOCATIONS)
    .filter(
      ([email, locationIds]) => email.startsWith("staff-") && locationIds.includes(locationId),
    )
    .map(([email]) => email);
}

export function managerEmailAtLocation(locationId: string) {
  const emails = Object.entries(SEED_USER_LOCATIONS)
    .filter(
      ([email, locationIds]) => email.startsWith("manager-") && locationIds.includes(locationId),
    )
    .map(([email]) => email)
    .sort();
  return emails[0] ?? null;
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

type ShiftTemplate = {
  slug: string;
  skillId: SkillId;
  dayOffset: number;
  startTime: string;
  endTime: string;
  notes?: string;
  daytimeOk: boolean;
};

/**
 * One published pattern per location-week. Same-skill days sit next to each other
 * so the person calendar can draw a continuous bar.
 */
const WEEK_TEMPLATES: ShiftTemplate[] = [
  {
    slug: "mon-dinner",
    skillId: "server",
    dayOffset: 0,
    startTime: "16:00",
    endTime: "22:00",
    notes: "Dinner service",
    daytimeOk: false,
  },
  {
    slug: "tue-dinner",
    skillId: "server",
    dayOffset: 1,
    startTime: "16:00",
    endTime: "22:00",
    notes: "Dinner service",
    daytimeOk: false,
  },
  {
    slug: "wed-dinner",
    skillId: "server",
    dayOffset: 2,
    startTime: "16:00",
    endTime: "22:00",
    notes: "Dinner service",
    daytimeOk: false,
  },
  {
    slug: "sun-brunch",
    skillId: "server",
    dayOffset: 6,
    startTime: "09:00",
    endTime: "15:00",
    notes: "Sunday brunch",
    daytimeOk: true,
  },
  {
    slug: "mon-line",
    skillId: "line_cook",
    dayOffset: 0,
    startTime: "11:00",
    endTime: "19:00",
    notes: "Prep and lunch",
    daytimeOk: false,
  },
  {
    slug: "thu-line",
    skillId: "line_cook",
    dayOffset: 3,
    startTime: "14:00",
    endTime: "22:00",
    notes: "Dinner line",
    daytimeOk: false,
  },
  {
    slug: "sat-cook",
    skillId: "line_cook",
    dayOffset: 5,
    startTime: "15:00",
    endTime: "23:00",
    notes: "Saturday line",
    daytimeOk: false,
  },
  {
    slug: "tue-host",
    skillId: "host",
    dayOffset: 1,
    startTime: "16:00",
    endTime: "22:00",
    notes: "Dinner door",
    daytimeOk: false,
  },
  {
    slug: "thu-host",
    skillId: "host",
    dayOffset: 3,
    startTime: "11:00",
    endTime: "16:00",
    notes: "Lunch door",
    daytimeOk: true,
  },
  {
    slug: "sat-host",
    skillId: "host",
    dayOffset: 5,
    startTime: "16:00",
    endTime: "22:00",
    notes: "Saturday door",
    daytimeOk: false,
  },
  {
    slug: "fri-bar",
    skillId: "bartender",
    dayOffset: 4,
    startTime: "17:00",
    endTime: "23:00",
    notes: "Friday bar",
    daytimeOk: false,
  },
  {
    slug: "sat-overnight",
    skillId: "bartender",
    dayOffset: 5,
    startTime: "23:00",
    endTime: "03:00",
    notes: "Overnight close",
    daytimeOk: false,
  },
  {
    slug: "sun-bar",
    skillId: "bartender",
    dayOffset: 6,
    startTime: "10:00",
    endTime: "16:00",
    notes: "Sunday service",
    daytimeOk: true,
  },
];

function canWorkTemplate(email: string, template: ShiftTemplate) {
  const daytimeOnly = staffIndexFromEmail(email) === 1;
  if (daytimeOnly && !template.daytimeOk) return false;
  return true;
}

export function buildLocationWeekShifts(
  locationId: string,
  weekStart: string,
  staffEmails: string[],
): SeedShiftSpec[] {
  return WEEK_TEMPLATES.flatMap((template) => {
    const assigneeEmails = emailsWithSkill(staffEmails, template.skillId).filter((email) =>
      canWorkTemplate(email, template),
    );
    if (assigneeEmails.length === 0) return [];

    return [
      {
        id: `shift-${locationId}-${weekStart}-${template.slug}`,
        locationId,
        skillId: template.skillId,
        dayOffset: template.dayOffset,
        startTime: template.startTime,
        endTime: template.endTime,
        headcountNeeded: Math.min(6, Math.max(2, assigneeEmails.length)),
        notes: template.notes,
        assigneeEmails,
      },
    ];
  });
}

export function buildSeedScheduleWeeks(anchorMonday: string) {
  const weekStarts = [-7, 0, 7].map((offset) => addDaysYmd(anchorMonday, offset));

  return SEED_LOCATIONS.flatMap((location) => {
    const staffEmails = staffEmailsAtLocation(location.id);
    const managerEmail = managerEmailAtLocation(location.id);
    return weekStarts.map((weekStart) => ({
      location,
      weekStart,
      managerEmail,
      shifts: buildLocationWeekShifts(location.id, weekStart, staffEmails),
    }));
  });
}
