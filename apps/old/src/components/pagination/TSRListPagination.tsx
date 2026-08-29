import { getRouteApi, type RegisteredRouter, type RouteIds } from "@tanstack/react-router";

type ListRouteId = RouteIds<RegisteredRouter["routeTree"]>;

type TSRListPaginationProps = {
  routeID: ListRouteId;
  totalPages: number;
};

/**
 * URL-driven list pagination. Merges `page` into existing search and omits it when `page <= 1`.
 * Returns null when there is only one page (or none).
 */
export function TSRListPagination({ routeID, totalPages }: TSRListPaginationProps) {
  const routeApi = getRouteApi(routeID);
  const search = routeApi.useSearch();
  const navigate = routeApi.useNavigate();
  const page = "page" in search ? (search.page ?? 1) : 1;

  if (totalPages <= 1) {
    return null;
  }

  function goToPage(nextPage: number) {
    void navigate({
      to: ".",
      search: (prev) => ({
        ...prev,
        page: nextPage > 1 ? nextPage : undefined,
      }),
      replace: true,
    });
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3" data-test="list-pagination">
      <p className="text-base-content/60 font-mono text-xs">
        Page {page} of {totalPages}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          className="btn btn-outline btn-sm"
          disabled={page <= 1}
          onClick={() => goToPage(page - 1)}
        >
          Previous
        </button>
        <button
          type="button"
          className="btn btn-outline btn-sm"
          disabled={page >= totalPages}
          onClick={() => goToPage(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
