import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { SearchIcon, XIcon } from "lucide-react";

type SearchBoxProps = {
  keyword: string;
  setKeyword: (value: string) => void;
  isDebouncing?: boolean;
  placeholder?: string;
  "data-test"?: string;
};

export function SearchBox({
  keyword,
  setKeyword,
  isDebouncing = false,
  placeholder = "Search…",
  "data-test": dataTest = "list-search",
}: SearchBoxProps) {
  return (
    <div className="relative w-full max-w-md" data-test={dataTest}>
      <SearchIcon
        aria-hidden
        className="text-base-content/45 pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
      />
      <Input
        type="search"
        value={keyword}
        onChange={(event) => setKeyword(event.target.value)}
        placeholder={placeholder}
        className="pr-10 pl-9"
        aria-label={placeholder}
      />
      <div className="absolute top-1/2 right-2 flex -translate-y-1/2 items-center gap-1">
        {isDebouncing ? <Spinner size={14} /> : null}
        {keyword ? (
          <button
            type="button"
            className="btn btn-ghost btn-xs btn-square"
            aria-label="Clear search"
            onClick={() => setKeyword("")}
          >
            <XIcon className="size-3.5" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
