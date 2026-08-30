import { Checkbox } from "@/components/ui/checkbox";

type AdminIdChecklistItem = {
  id: string;
  label: string;
  hint?: string;
};

export function AdminIdChecklist({
  items,
  selected,
  onToggle,
  emptyLabel,
}: {
  items: AdminIdChecklistItem[];
  selected: Set<string>;
  onToggle: (id: string, next: boolean) => void;
  emptyLabel: string;
}) {
  if (items.length === 0) {
    return <p className="text-muted-foreground text-xs">{emptyLabel}</p>;
  }

  return (
    <ul className="flex flex-col gap-1">
      {items.map((item) => (
        <li key={item.id}>
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2">
            <Checkbox
              className="mt-0.5"
              checked={selected.has(item.id)}
              onCheckedChange={(checked) => onToggle(item.id, checked === true)}
            />
            <span>
              <span className="block text-sm">{item.label}</span>
              {item.hint ? (
                <span className="text-muted-foreground block font-mono text-xs">{item.hint}</span>
              ) : null}
            </span>
          </label>
        </li>
      ))}
    </ul>
  );
}
