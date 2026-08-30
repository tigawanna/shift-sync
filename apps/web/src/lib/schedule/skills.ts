export const SKILL_IDS = ["bartender", "line_cook", "server", "host"] as const;

export type SkillId = (typeof SKILL_IDS)[number];

export const SKILLS: Array<{ id: SkillId; name: string }> = [
  { id: "bartender", name: "Bartender" },
  { id: "line_cook", name: "Line cook" },
  { id: "server", name: "Server" },
  { id: "host", name: "Host" },
];

export function isSkillId(value: string): value is SkillId {
  return (SKILL_IDS as readonly string[]).includes(value);
}
