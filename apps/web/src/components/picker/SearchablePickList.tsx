import { SearchBox } from "@/components/search/SearchBox";

export type SearchablePickItem = {
  id: string;
  label: string;
  hint?: string;
};

export function SearchablePickList({
  items,
  selectedId,
  onSelect,
  allLabel,
  isPending,
  summary,
  inputValue,
  onInputChange,
  isDebouncing,
  placeholder,
  searchTestId,
  page,
  totalPages,
  onPageChange,
}: {
  items: SearchablePickItem[];
  selectedId: string | undefined;
  onSelect: (id: string | undefined) => void;
  allLabel?: string;
  isPending: boolean;
  summary: string;
  inputValue: string;
  onInputChange: (value: string) => void;
  isDebouncing: boolean;
  placeholder: string;
  searchTestId?: string;
  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
}) {
  const showPager = Boolean(onPageChange && totalPages && totalPages > 1 && page);

  return (
    <div className="flex flex-col gap-3 px-4 pb-4">
      <SearchBox
        keyword={inputValue}
        setKeyword={onInputChange}
        isDebouncing={isDebouncing}
        placeholder={placeholder}
        data-test={searchTestId}
      />
      <p className="text-muted-foreground text-xs">{isPending ? "Loading…" : summary}</p>
      <ul className="flex flex-col gap-1">
        {allLabel ? (
          <li>
            <button
              type="button"
              className={`hover:bg-muted/50 w-full rounded-lg px-3 py-2 text-left ${
                !selectedId ? "bg-primary/40 font-medium" : ""
              }`}
              onClick={() => onSelect(undefined)}
            >
              {allLabel}
            </button>
          </li>
        ) : null}
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              className={`hover:bg-muted/50 w-full rounded-lg px-3 py-2 text-left ${
                selectedId === item.id ? "bg-primary/40 font-medium" : ""
              }`}
              onClick={() => onSelect(item.id)}
            >
              <span className="block text-sm">{item.label}</span>
              {item.hint ? (
                <span className="text-muted-foreground block text-xs">{item.hint}</span>
              ) : null}
            </button>
          </li>
        ))}
      </ul>
      {showPager && page && totalPages && onPageChange ? (
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            disabled={page <= 1}
            onClick={() => onPageChange(Math.max(1, page - 1))}
          >
            Previous
          </button>
          <p className="text-muted-foreground text-xs tabular-nums">
            {page} / {totalPages}
          </p>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            Next
          </button>
        </div>
      ) : null}
    </div>
  );
}
