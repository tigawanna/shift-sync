import { updateTeamMemberSkills } from "@/data-access-layer/team/team.functions";
import { teamMemberQueryOptions } from "@/data-access-layer/team/team.queries";
import { SKILLS, type SkillId } from "@/lib/schedule/skills";
import { skillAccentClass } from "../../../-components/schedule/shift-display";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

type UserSkillsEditorProps = {
  userId: string;
  savedSkillIds: string[];
};

export function UserSkillsEditor({ userId, savedSkillIds }: UserSkillsEditorProps) {
  const qc = useQueryClient();
  const [selectedSkillIds, setSelectedSkillIds] = useState<SkillId[]>(
    savedSkillIds.filter((id): id is SkillId => SKILLS.some((skill) => skill.id === id)),
  );

  const saveMutation = useMutation({
    mutationFn: async (skillIds: SkillId[]) => {
      return updateTeamMemberSkills({ data: { userId, skillIds } });
    },
    onSuccess: async (updated) => {
      qc.setQueryData(teamMemberQueryOptions({ userId }).queryKey, updated);
      await qc.invalidateQueries({ queryKey: ["team-member", userId] });
      await qc.invalidateQueries({ queryKey: ["schedule"] });
      toast.success("Skills updated.");
    },
    onError: (saveError) => {
      toast.error(saveError instanceof Error ? saveError.message : "Could not save skills.");
    },
  });

  const hasChanges =
    selectedSkillIds.length !== savedSkillIds.length ||
    selectedSkillIds.some((id) => !savedSkillIds.includes(id));

  const summary =
    selectedSkillIds.length === 0
      ? "none"
      : SKILLS.filter((skill) => selectedSkillIds.includes(skill.id))
          .map((skill) => skill.name)
          .join(", ");

  return (
    <details
      className="border-base-content/10 bg-base-100/70 rounded-2xl border"
      data-test="user-skill-assignments"
    >
      <summary className="cursor-pointer list-none px-5 py-4 text-sm font-medium [&::-webkit-details-marker]:hidden">
        Skills
        <span className="text-base-content/50 font-normal"> · {summary}</span>
      </summary>
      <div className="flex flex-col gap-4 px-5 pb-5">
        <p className="text-base-content/70 text-sm">
          Staff can only be assigned to shifts that require one of these skills.
        </p>
        <ul className="flex flex-col gap-2">
          {SKILLS.map((skill) => {
            const checked = selectedSkillIds.includes(skill.id);
            return (
              <li key={skill.id}>
                <div
                  className={`border-base-content/10 hover:border-base-content/20 flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition-colors ${checked ? "bg-base-300/40" : "bg-base-100/50"}`}
                >
                  <Checkbox
                    className="ring-primary"
                    checked={checked}
                    onCheckedChange={(value) => {
                      const nextChecked = value === true;
                      setSelectedSkillIds((current) => {
                        const has = current.includes(skill.id);
                        if (nextChecked && !has) return [...current, skill.id];
                        if (!nextChecked && has) return current.filter((id) => id !== skill.id);
                        return current;
                      });
                    }}
                  />
                  <span
                    className={`rounded-md border px-2 py-0.5 text-xs font-medium ${skillAccentClass(skill.id)}`}
                  >
                    {skill.name}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
        <button
          type="button"
          className="btn btn-primary btn-sm self-start"
          disabled={!hasChanges || saveMutation.isPending}
          onClick={() => saveMutation.mutate(selectedSkillIds)}
        >
          {saveMutation.isPending ? "Saving…" : "Save skills"}
        </button>
      </div>
    </details>
  );
}
