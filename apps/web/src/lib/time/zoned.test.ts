import {
  addDaysYmd,
  eachYmdInclusive,
  formatDateInZone,
  minutesFromMidnight,
  mondayOfWeekContaining,
  weekdayInZone,
  zonedWallTimeToUtc,
} from "@/lib/time/zoned";
import { describe, expect, it } from "vite-plus/test";

const LA = "America/Los_Angeles";
const NY = "America/New_York";

const hours = (from: Date, to: Date) => (to.getTime() - from.getTime()) / 3_600_000;

describe("zonedWallTimeToUtc", () => {
  it("resolves a wall time against the location offset, not the host", () => {
    expect(zonedWallTimeToUtc("2026-08-17", "09:00", LA).toISOString()).toBe(
      "2026-08-17T16:00:00.000Z",
    );
    expect(zonedWallTimeToUtc("2026-08-17", "09:00", NY).toISOString()).toBe(
      "2026-08-17T13:00:00.000Z",
    );
  });

  it("keeps winter offsets distinct from summer offsets", () => {
    expect(zonedWallTimeToUtc("2026-01-17", "09:00", LA).toISOString()).toBe(
      "2026-01-17T17:00:00.000Z",
    );
  });

  it("gives a 23-hour civil day when DST springs forward", () => {
    const start = zonedWallTimeToUtc("2026-03-08", "00:00", NY);
    const end = zonedWallTimeToUtc("2026-03-09", "00:00", NY);
    expect(hours(start, end)).toBe(23);
  });

  it("gives a 25-hour civil day when DST falls back", () => {
    const start = zonedWallTimeToUtc("2026-11-01", "00:00", NY);
    const end = zonedWallTimeToUtc("2026-11-02", "00:00", NY);
    expect(hours(start, end)).toBe(25);
  });

  it("survives a round trip through the civil date", () => {
    const instant = zonedWallTimeToUtc("2026-11-01", "01:30", NY);
    expect(formatDateInZone(instant, NY)).toBe("2026-11-01");
    expect(minutesFromMidnight(instant, NY)).toBe(90);
  });
});

describe("formatDateInZone", () => {
  it("puts one instant on different civil dates in each zone", () => {
    const instant = new Date("2026-08-18T05:00:00.000Z");
    expect(formatDateInZone(instant, LA)).toBe("2026-08-17");
    expect(formatDateInZone(instant, NY)).toBe("2026-08-18");
  });
});

describe("weekdayInZone", () => {
  it("uses the location clock to pick the weekday", () => {
    const instant = new Date("2026-08-17T02:00:00.000Z");
    expect(weekdayInZone(instant, LA)).toBe(0);
    expect(weekdayInZone(instant, NY)).toBe(0);
    expect(weekdayInZone(new Date("2026-08-17T16:00:00.000Z"), LA)).toBe(1);
  });
});

describe("mondayOfWeekContaining", () => {
  it("anchors the week to the location, so a late Sunday stays in the old week", () => {
    const sundayEveningInLA = new Date("2026-08-17T02:00:00.000Z");
    expect(mondayOfWeekContaining(sundayEveningInLA, LA)).toBe("2026-08-10");
  });

  it("returns the same date when the instant is already Monday local", () => {
    expect(mondayOfWeekContaining(zonedWallTimeToUtc("2026-08-17", "09:00", LA), LA)).toBe(
      "2026-08-17",
    );
  });

  it("treats Sunday as the end of the week, not the start", () => {
    expect(mondayOfWeekContaining(zonedWallTimeToUtc("2026-08-23", "09:00", LA), LA)).toBe(
      "2026-08-17",
    );
  });
});

describe("addDaysYmd", () => {
  it("crosses month and year boundaries", () => {
    expect(addDaysYmd("2026-02-28", 1)).toBe("2026-03-01");
    expect(addDaysYmd("2024-02-28", 1)).toBe("2024-02-29");
    expect(addDaysYmd("2026-01-01", -1)).toBe("2025-12-31");
  });
});

describe("eachYmdInclusive", () => {
  it("includes both ends", () => {
    expect(eachYmdInclusive("2026-08-17", "2026-08-19")).toEqual([
      "2026-08-17",
      "2026-08-18",
      "2026-08-19",
    ]);
  });
});
