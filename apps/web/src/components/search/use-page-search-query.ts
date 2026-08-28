import {
  useNavigate,
  useSearch,
  type RegisteredRouter,
  type RouteIds,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";

type SearchWithQPage = {
  q?: string;
  page?: number;
};

type ListRouteId = RouteIds<RegisteredRouter["routeTree"]>;

/**
 * Local search input + debounced URL `q`. Resets `page` when the committed query changes.
 * Pass the file route id (e.g. `/_dashboard/admin/waitlist/`), not the path.
 */
export function usePageSearchQuery(from: ListRouteId, debounceMs = 400) {
  // TSR `from` generics don't accept a widened RouteIds parameter; cast at the boundary.
  const search = useSearch({ from: from as never }) as SearchWithQPage;
  const navigate = useNavigate({ from: from as never });
  const committedQ = search.q ?? "";

  const [inputValue, setInputValue] = useState(committedQ);
  const [isDebouncing, setIsDebouncing] = useState(false);

  useEffect(() => {
    setInputValue(committedQ);
  }, [committedQ]);

  useEffect(() => {
    if (inputValue === committedQ) {
      setIsDebouncing(false);
      return;
    }

    setIsDebouncing(true);
    const timeout = window.setTimeout(() => {
      const trimmed = inputValue.trim();
      void navigate({
        search: ((prev: SearchWithQPage) => ({
          ...prev,
          q: trimmed || undefined,
          page: undefined,
        })) as never,
        replace: true,
      });
      setIsDebouncing(false);
    }, debounceMs);

    return () => window.clearTimeout(timeout);
  }, [inputValue, committedQ, debounceMs, navigate]);

  function onSearchChange(value: string) {
    setInputValue(value);
  }

  function clearSearch() {
    setInputValue("");
    setIsDebouncing(false);
    void navigate({
      search: ((prev: SearchWithQPage) => ({
        ...prev,
        q: undefined,
        page: undefined,
      })) as never,
      replace: true,
    });
  }

  return {
    inputValue,
    onSearchChange,
    isDebouncing,
    clearSearch,
    committedQ,
  };
}
