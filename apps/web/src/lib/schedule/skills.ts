export const SKILL_IDS = ["bartender", "line_cook", "server", "host"] as const;

export type SkillId = (typeof SKILL_IDS)[number];

export const SKILLS: Array<{ id: SkillId; name: string }> = [
  { id: "bartender", name: "Bartender" },
  { id: "line_cook", name: "Line cook" },
  { id: "server", name: "Server" },
  { id: "host", name: "Host" },
];

export const SKILL_ACCENT: Record<SkillId, string> = {
  bartender: "border-amber-400/70 bg-amber-400/10 text-amber-950 dark:text-amber-100",
  line_cook: "border-rose-400/70 bg-rose-400/10 text-rose-950 dark:text-rose-100",
  server: "border-sky-400/70 bg-sky-400/10 text-sky-950 dark:text-sky-100",
  host: "border-emerald-400/70 bg-emerald-400/10 text-emerald-950 dark:text-emerald-100",
};

export function isSkillId(value: string): value is SkillId {
  return (SKILL_IDS as readonly string[]).includes(value);
}
