import { isSkillId, SKILL_ACCENT } from "@/lib/schedule/skills";
import type { WeekShift } from "@/data-access-layer/schedule/schedule.types";

export function skillAccentClass(skillId: string) {
  return isSkillId(skillId) ? SKILL_ACCENT[skillId] : "border-base-content/20 bg-base-200/60";
}

export function shiftTimeLabel(shift: WeekShift) {
  if (shift.overnight) {
    return `${shift.startTime}–${shift.endTime} (+1)`;
  }
  return `${shift.startTime}–${shift.endTime}`;
}

export function coverageLabel(shift: WeekShift) {
  return `${shift.assignedCount}/${shift.headcountNeeded}`;
}
