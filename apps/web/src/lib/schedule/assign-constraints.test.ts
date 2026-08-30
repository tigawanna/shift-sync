import {
  clipWeeklyHours,
  evaluateAssignmentConstraints,
  formatAssignFailure,
  hoursByLocalDate,
  type ConstraintIssue,
  type ShiftInterval,
} from "@/lib/schedule/assign-constraints";
import type { AvailabilityException, AvailabilityWindow } from "@/lib/schedule/availability";
import { zonedWallTimeToUtc } from "@/lib/time/zoned";
import { describe, expect, it } from "vite-plus/test";

const LA = "America/Los_Angeles";
const NY = "America/New_York";

/** 2026-08-17 is a Monday; the whole suite lives in that week. */
const MONDAY = "2026-08-17";
const at = (ymd: string, hm: string, zone = LA) => zonedWallTimeToUtc(ymd, hm, zone);
const rules = (issues: ConstraintIssue[]) => issues.map((issue) => issue.rule);

/** Available every day 09:00–17:00 local. Weekday is JS Sun=0. */
const NINE_TO_FIVE: AvailabilityWindow[] = [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
  weekday,
  startMinute: 9 * 60,
  endMinute: 17 * 60,
}));

const ALWAYS_OPEN: AvailabilityWindow[] = [];

function shiftInterval(
  startsAt: Date,
  endsAt: Date,
  extra: Partial<ShiftInterval> = {},
): ShiftInterval {
  return { id: crypto.randomUUID(), startsAt, endsAt, ...extra };
}

function evaluate(input: {
  startsAt: Date;
  endsAt: Date;
  zone?: string;
  otherShifts?: ShiftInterval[];
  weekly?: AvailabilityWindow[];
  exceptions?: AvailabilityException[];
}) {
  return evaluateAssignmentConstraints({
    candidateStartsAt: input.startsAt,
    candidateEndsAt: input.endsAt,
    locationTimezone: input.zone ?? LA,
    locationName: "Harbor House",
    otherShifts: input.otherShifts ?? [],
    weekly: input.weekly ?? ALWAYS_OPEN,
    exceptions: input.exceptions ?? [],
  });
}

describe("hoursByLocalDate", () => {
  it("splits an overnight shift across two civil dates", () => {
    const hours = hoursByLocalDate(at(MONDAY, "23:00"), at("2026-08-18", "03:00"), LA);
    expect(Object.fromEntries(hours)).toEqual({ "2026-08-17": 1, "2026-08-18": 3 });
  });

  it("keeps a same-day shift on one date", () => {
    const hours = hoursByLocalDate(at(MONDAY, "09:00"), at(MONDAY, "17:00"), LA);
    expect(Object.fromEntries(hours)).toEqual({ "2026-08-17": 8 });
  });

  it("buckets by the location clock, so the same instants land on different dates", () => {
    const startsAt = at(MONDAY, "21:00", LA);
    const endsAt = at("2026-08-18", "01:00", LA);
    expect([...hoursByLocalDate(startsAt, endsAt, LA).keys()]).toEqual([
      "2026-08-17",
      "2026-08-18",
    ]);
    expect([...hoursByLocalDate(startsAt, endsAt, NY).keys()]).toEqual(["2026-08-18"]);
  });

  it("counts a DST-shortened civil day as 23 hours", () => {
    const hours = hoursByLocalDate(
      at("2026-03-08", "00:00", NY),
      at("2026-03-09", "00:00", NY),
      NY,
    );
    expect(hours.get("2026-03-08")).toBe(23);
  });
});

describe("clipWeeklyHours", () => {
  it("ignores a shift outside the week", () => {
    const previousWeek = [
      { startsAt: at("2026-08-10", "09:00"), endsAt: at("2026-08-10", "17:00") },
    ];
    expect(clipWeeklyHours(previousWeek, MONDAY, LA)).toBe(0);
  });

  it("clips a shift that straddles the week boundary", () => {
    const straddling = [{ startsAt: at("2026-08-16", "22:00"), endsAt: at(MONDAY, "02:00") }];
    expect(clipWeeklyHours(straddling, MONDAY, LA)).toBe(2);
  });

  it("sums hours from every location", () => {
    const twoSites = [
      { startsAt: at(MONDAY, "09:00", LA), endsAt: at(MONDAY, "17:00", LA) },
      { startsAt: at("2026-08-18", "09:00", NY), endsAt: at("2026-08-18", "17:00", NY) },
    ];
    expect(clipWeeklyHours(twoSites, MONDAY, LA)).toBe(16);
  });
});

describe("double booking", () => {
  it("rejects an overlap at another location", () => {
    const other = shiftInterval(at(MONDAY, "12:00"), at(MONDAY, "20:00"), {
      locationName: "Pier 39 Bistro",
    });
    const result = evaluate({
      startsAt: at(MONDAY, "09:00"),
      endsAt: at(MONDAY, "17:00"),
      otherShifts: [other],
    });
    expect(rules(result.failures)).toContain("double_booking");
    expect(result.failures[0]?.message).toContain("Pier 39 Bistro");
  });

  it("allows back-to-back shifts that only touch at the boundary once rest is met", () => {
    const other = shiftInterval(at(MONDAY, "17:00"), at(MONDAY, "20:00"));
    const result = evaluate({
      startsAt: at(MONDAY, "09:00"),
      endsAt: at(MONDAY, "17:00"),
      otherShifts: [other],
    });
    expect(rules(result.failures)).not.toContain("double_booking");
  });
});

describe("rest period", () => {
  it("rejects a 7-hour gap after the previous shift", () => {
    const other = shiftInterval(at(MONDAY, "00:00"), at(MONDAY, "02:00"));
    const result = evaluate({
      startsAt: at(MONDAY, "09:00"),
      endsAt: at(MONDAY, "17:00"),
      otherShifts: [other],
    });
    expect(rules(result.failures)).toContain("rest_period");
  });

  it("accepts a gap of exactly 10 hours", () => {
    const other = shiftInterval(at("2026-08-16", "21:00"), at("2026-08-16", "23:00"));
    const result = evaluate({
      startsAt: at(MONDAY, "09:00"),
      endsAt: at(MONDAY, "17:00"),
      otherShifts: [other],
    });
    expect(rules(result.failures)).not.toContain("rest_period");
  });

  it("checks rest before the next shift too", () => {
    const other = shiftInterval(at("2026-08-18", "01:00"), at("2026-08-18", "05:00"));
    const result = evaluate({
      startsAt: at(MONDAY, "09:00"),
      endsAt: at(MONDAY, "17:00"),
      otherShifts: [other],
    });
    expect(rules(result.failures)).toContain("rest_period");
  });
});

describe("availability", () => {
  it("matches a 9-to-5 window in the location clock, in either zone", () => {
    const pacific = evaluate({
      startsAt: at(MONDAY, "09:00", LA),
      endsAt: at(MONDAY, "17:00", LA),
      zone: LA,
      weekly: NINE_TO_FIVE,
    });
    const eastern = evaluate({
      startsAt: at(MONDAY, "09:00", NY),
      endsAt: at(MONDAY, "17:00", NY),
      zone: NY,
      weekly: NINE_TO_FIVE,
    });
    expect(rules(pacific.failures)).not.toContain("availability");
    expect(rules(eastern.failures)).not.toContain("availability");
  });

  it("rejects Pacific hours judged against a 9-to-5 kept in Eastern", () => {
    const result = evaluate({
      startsAt: at(MONDAY, "09:00", LA),
      endsAt: at(MONDAY, "17:00", LA),
      zone: NY,
      weekly: NINE_TO_FIVE,
    });
    expect(rules(result.failures)).toContain("availability");
  });

  it("treats an empty weekly schedule as open", () => {
    const result = evaluate({
      startsAt: at(MONDAY, "02:00"),
      endsAt: at(MONDAY, "06:00"),
      weekly: ALWAYS_OPEN,
    });
    expect(rules(result.failures)).not.toContain("availability");
  });

  it("lets a blocked exception override an open schedule", () => {
    const result = evaluate({
      startsAt: at(MONDAY, "09:00"),
      endsAt: at(MONDAY, "17:00"),
      weekly: ALWAYS_OPEN,
      exceptions: [{ date: MONDAY, kind: "blocked", startMinute: 0, endMinute: 24 * 60 }],
    });
    expect(rules(result.failures)).toContain("availability");
  });

  it("lets an extra exception open a day outside the weekly window", () => {
    const result = evaluate({
      startsAt: at(MONDAY, "19:00"),
      endsAt: at(MONDAY, "22:00"),
      weekly: NINE_TO_FIVE,
      exceptions: [{ date: MONDAY, kind: "extra", startMinute: 18 * 60, endMinute: 23 * 60 }],
    });
    expect(rules(result.failures)).not.toContain("availability");
  });

  it("rejects a shift that starts inside the window but runs past it", () => {
    const result = evaluate({
      startsAt: at(MONDAY, "15:00"),
      endsAt: at(MONDAY, "19:00"),
      weekly: NINE_TO_FIVE,
    });
    expect(rules(result.failures)).toContain("availability");
  });
});

describe("daily hours", () => {
  it("warns over 8 hours", () => {
    const result = evaluate({ startsAt: at(MONDAY, "09:00"), endsAt: at(MONDAY, "19:00") });
    expect(rules(result.warnings)).toContain("daily_hours");
    expect(rules(result.failures)).not.toContain("daily_hours");
  });

  it("hard blocks over 12 hours once another shift on that date is counted", () => {
    const other = shiftInterval(at(MONDAY, "00:00"), at(MONDAY, "06:00"));
    const result = evaluate({
      startsAt: at(MONDAY, "16:00"),
      endsAt: at("2026-08-18", "00:00"),
      otherShifts: [other],
    });
    expect(rules(result.failures)).toContain("daily_hours");
  });

  it("counts another location's hours on the civil date of the location being assigned", () => {
    // 20:00 Monday to 02:00 Tuesday Eastern is 17:00–23:00 Monday Pacific, so all
    // six hours land on Monday for a Pacific assignment: 6 + 6 = 12h that day.
    const eastern = shiftInterval(at(MONDAY, "20:00", NY), at("2026-08-18", "02:00", NY));
    const result = evaluate({
      startsAt: at(MONDAY, "09:00", LA),
      endsAt: at(MONDAY, "15:00", LA),
      zone: LA,
      otherShifts: [eastern],
    });
    const daily = result.warnings.find((issue) => issue.rule === "daily_hours");
    expect(daily?.message).toContain("12.0h on 2026-08-17");
  });
});

describe("weekly hours", () => {
  const fullDay = (ymd: string) => shiftInterval(at(ymd, "09:00"), at(ymd, "17:00"));

  it("warns at 35 or more", () => {
    const result = evaluate({
      startsAt: at("2026-08-21", "09:00"),
      endsAt: at("2026-08-21", "14:00"),
      otherShifts: ["2026-08-17", "2026-08-18", "2026-08-19", "2026-08-20"].map(fullDay),
    });
    const weekly = result.warnings.find((issue) => issue.rule === "weekly_hours");
    expect(weekly?.message).toContain("37.0h");
    expect(weekly?.message).toContain("warning at 35+");
  });

  it("reports over the limit past 40, and does not hard block", () => {
    const result = evaluate({
      startsAt: at("2026-08-22", "09:00"),
      endsAt: at("2026-08-22", "17:00"),
      otherShifts: ["2026-08-17", "2026-08-18", "2026-08-19", "2026-08-20", "2026-08-21"].map(
        fullDay,
      ),
    });
    expect(rules(result.warnings)).toContain("weekly_hours");
    expect(rules(result.failures)).not.toContain("weekly_hours");
    expect(result.weeklyHours).toBe(48);
  });
});

describe("consecutive days", () => {
  const oneHourOn = (ymd: string) => shiftInterval(at(ymd, "10:00"), at(ymd, "11:00"));

  it("warns on the 6th day, and a 1-hour shift counts as a day", () => {
    const result = evaluate({
      startsAt: at("2026-08-22", "10:00"),
      endsAt: at("2026-08-22", "11:00"),
      otherShifts: ["2026-08-17", "2026-08-18", "2026-08-19", "2026-08-20", "2026-08-21"].map(
        oneHourOn,
      ),
    });
    expect(rules(result.warnings)).toContain("consecutive_days");
    expect(result.requiresOverride).toBe(false);
  });

  it("requires an override on the 7th day", () => {
    const result = evaluate({
      startsAt: at("2026-08-23", "10:00"),
      endsAt: at("2026-08-23", "11:00"),
      otherShifts: [
        "2026-08-17",
        "2026-08-18",
        "2026-08-19",
        "2026-08-20",
        "2026-08-21",
        "2026-08-22",
      ].map(oneHourOn),
    });
    expect(result.requiresOverride).toBe(true);
    expect(rules(result.failures)).toContain("consecutive_days");
  });

  it("does not warn when a rest day breaks the streak", () => {
    const result = evaluate({
      startsAt: at("2026-08-23", "10:00"),
      endsAt: at("2026-08-23", "11:00"),
      otherShifts: ["2026-08-17", "2026-08-18", "2026-08-20", "2026-08-21", "2026-08-22"].map(
        oneHourOn,
      ),
    });
    expect(rules(result.warnings)).not.toContain("consecutive_days");
    expect(result.requiresOverride).toBe(false);
  });

  it("counts a previous week's days separately", () => {
    const result = evaluate({
      startsAt: at(MONDAY, "10:00"),
      endsAt: at(MONDAY, "11:00"),
      otherShifts: ["2026-08-12", "2026-08-13", "2026-08-14", "2026-08-15", "2026-08-16"].map(
        oneHourOn,
      ),
    });
    expect(rules(result.warnings)).not.toContain("consecutive_days");
  });
});

describe("formatAssignFailure", () => {
  it("names alternatives when there are any", () => {
    const message = formatAssignFailure(
      [{ rule: "rest_period", message: "Rest: only 7.0h after the previous shift (need 10h)." }],
      ["John", "Maria"],
    );
    expect(message).toBe(
      "Rest: only 7.0h after the previous shift (need 10h). Alternatives: John, Maria.",
    );
  });

  it("says so when nobody else clears the rules", () => {
    const message = formatAssignFailure(
      [{ rule: "availability", message: "Availability: no." }],
      [],
    );
    expect(message).toContain("No other qualified staff clear these rules.");
  });
});
