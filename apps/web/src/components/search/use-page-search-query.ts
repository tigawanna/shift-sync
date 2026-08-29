import { useDebouncedCallback } from "@tanstack/react-pacer";
import { getRouteApi, type RegisteredRouter, type RouteIds } from "@tanstack/react-router";
import { useEffect, useState } from "react";

const SEARCH_DEBOUNCE_MS = 400;

type SearchWithQPage = {
  sq?: string;
  page?: number;
  perPage?: number;
};

type ListRouteId = RouteIds<RegisteredRouter["routeTree"]>;

/**
 * Debounced URL `sq` search for a TanStack Router route id.
 *
 * Keeps a local input value in sync with the committed `sq` search param and
 * resets `page` whenever the query commits or clears.
 *
 * @param routeID - File route id (e.g. `"/_dashboard/admin/users/"`).
 */
export function usePageSearchQuery(routeID: ListRouteId, debounceMs = SEARCH_DEBOUNCE_MS) {
  const routeApi = getRouteApi(routeID);
  const routeSearch = routeApi.useSearch() as SearchWithQPage;
  const navigate = routeApi.useNavigate();
  const searchQuery = routeSearch.sq ?? "";
  const [inputValue, setInputValue] = useState(searchQuery);

  useEffect(() => {
    setInputValue(searchQuery);
  }, [searchQuery]);

  const commitSearch = useDebouncedCallback(
    (value: string) => {
      const trimmed = value.trim();
      void navigate({
        search: (prev: SearchWithQPage) => ({
          ...prev,
          sq: trimmed.length > 0 ? trimmed : undefined,
          page: undefined,
        }),
        replace: true,
      });
    },
    { wait: debounceMs },
  );

  function onSearchChange(value: string) {
    setInputValue(value);
    commitSearch(value);
  }

  /** Clears the search input and URL `sq` immediately (no debounce). */
  function clearSearch() {
    setInputValue("");
    void navigate({
      search: (prev: SearchWithQPage) => ({
        ...prev,
        sq: undefined,
        page: undefined,
      }),
      replace: true,
    });
  }

  const isDebouncing = inputValue.trim() !== searchQuery;

  return { inputValue, onSearchChange, clearSearch, isDebouncing };
}
