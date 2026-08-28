# Paginated List Pattern

How to build searchable, paginated dashboard lists using the shared utilities — modeled on `ListUsers` and `ListLocations`.

Apply this when adding or cleaning up any admin/manager index list (users, team, locations, waitlist, etc.). Same fundamentals whether data comes from React Query or TanStack DB.

---

## Shared utilities

| Utility                       | Path                                          | Role                                                                            |
| ----------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------- |
| `usePageSearchQuery(routeID)` | `components/search/use-page-search-query.ts`  | Local input + debounced URL `q`; resets `page` on commit; exposes `clearSearch` |
| `SearchBox`                   | `components/search/SearchBox.tsx`             | Controlled search input; shows spinner while `isDebouncing`                     |
| `TSRListPagination`           | `components/pagination/TSRListPagination.tsx` | Reads `page` from the route search, navigates while preserving other params     |
| `ADMIN_LIST_PER_PAGE`         | `components/pagination/constants.ts`          | Default page size for server-paginated admin lists                              |

Always pass the **file route id** (e.g. `"/_dashboard/admin/users/"`), not the path (`"/admin/users"`).

---

## Route API (`getRouteApi`)

Each list component is tied to **one route**. Declare the route id once at module scope, then use the typed route API for search params and navigation.

```tsx
import { getRouteApi } from "@tanstack/react-router";

const ROUTE_ID = "/_dashboard/admin/users/";
const routeApi = getRouteApi(ROUTE_ID);

export function ListUsers() {
  const { inputValue, onSearchChange, isDebouncing, clearSearch } = usePageSearchQuery(ROUTE_ID);
  const search = routeApi.useSearch();
  const navigate = routeApi.useNavigate();

  const page = search.page ?? 1;
  const q = (search.q ?? "").trim();

  // fetch with committed URL values (page, q) — not inputValue
}
```

### Why `getRouteApi` instead of passing `routeId` as a prop

- **Typed search params** — `routeApi.useSearch()` is inferred from the route's `validateSearch`.
- **One list per route** — colocate under `routes/_dashboard/<area>/<page>/-components/List*.tsx`.
- **No prop drilling** — `ROUTE_ID` is a module constant shared by search, pagination, and sort/filter controls.

Do **not** use `Route.useSearch()` / `Route.useNavigate()` from the route file inside a shared panel that serves multiple routes. Split into route-specific list components instead.

### Search + pagination wiring

```tsx
const { inputValue, onSearchChange, isDebouncing } = usePageSearchQuery(ROUTE_ID);

<SearchBox
  keyword={inputValue}
  setKeyword={(value) => onSearchChange(value)}
  isDebouncing={isDebouncing}
  placeholder="Search by name or email"
/>

<TSRListPagination routeID={ROUTE_ID} totalPages={totalPages} />
```

### Search param contract

- URL param is always **`q`** (not `sq` / `search`).
- Route `validateSearch` must include `q: z.string().optional()` and `page: z.coerce.number().int().min(1).optional()`.
- Debounced commit clears `page` so results start at page 1.
- Default debounce is **400ms**.
- `clearSearch()` clears `q` + `page` immediately (no debounce) — use it on search-empty CTAs.
- Filter / sort patches use `routeApi.useNavigate()` — not the search hook.
- Always pass `to: "."` when patching search so navigation stays on the public path (e.g. `/admin/users`) instead of the internal route id (`/_dashboard/admin/users`).

### Pagination contract

- `TSRListPagination` merges into existing search (sort, filters, `q`) and omits `page` when `page <= 1`.
- Returns `null` when `totalPages <= 1`.
- Do **not** hand-roll `useTransition` + `navigate` page setters beside it.

---

## Anatomy: list component

Each route gets a self-contained list component. The route file stays thin: header, create actions, then the list.

```
┌─ route/index.tsx ───────────────────────┐
│ DashboardPageHeader + create dialogs    │
│ <Suspense>                              │
│   <ListUsers />                         │
│ </Suspense>                             │
└─────────────────────────────────────────┘

┌─ ListUsers.tsx ─────────────────────────┐
│ [count label]  [SearchBox]              │
│ <Table data={items} />                  │
│ <TSRListPagination />                   │
└─────────────────────────────────────────┘
```

List-level actions (create user, add location) live in the **route file**. Search, table, and pagination live in the **list component**.

Row-level actions (impersonate, edit, delete) stay on the row or table component.

---

## Full example (React Query)

```tsx
import { SearchBox } from "@/components/search/SearchBox";
import { usePageSearchQuery } from "@/components/search/use-page-search-query";
import { TSRListPagination } from "@/components/pagination/TSRListPagination";
import { teamMembersQueryOptions } from "@/data-access-layer/team/team.queries";
import { useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { TeamMembersTable } from "../../../-components/team/TeamMembersTable";

const ROUTE_ID = "/_dashboard/admin/users/";
const routeApi = getRouteApi(ROUTE_ID);

export function ListUsers() {
  const { inputValue, onSearchChange, isDebouncing } = usePageSearchQuery(ROUTE_ID);
  const search = routeApi.useSearch();
  const page = search.page ?? 1;
  const q = (search.q ?? "").trim();

  const { data } = useSuspenseQuery(
    teamMembersQueryOptions({ page, search: q || undefined }),
  );

  const { members, total, totalPages } = data;

  return (
    <section className="flex h-full w-full flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <p className="text-base-content/60 font-mono text-xs">{total} people</p>
        <SearchBox
          keyword={inputValue}
          setKeyword={(value) => onSearchChange(value)}
          isDebouncing={isDebouncing}
          placeholder="Search by name or email"
        />
      </div>
      <TeamMembersTable members={members} emptyMessage="…" showImpersonate />
      <TSRListPagination routeID={ROUTE_ID} totalPages={totalPages} />
    </section>
  );
}
```

---

## Early returns over nested ternaries

Prefer extracting empty/pending states into the table component or small presentational helpers:

```tsx
if (isPending) return <TableSkeleton />;
if (items.length === 0) return hasSearch ? <SearchEmpty query={q} /> : <Empty />;
return <Table data={items} />;
```

Avoid nested ternaries in JSX. When using `useSuspenseQuery`, the route-level `<Suspense>` boundary handles the pending shell.

---

## Data sources

### React Query (server-paginated)

Users, team, and locations style:

```tsx
const search = routeApi.useSearch();
const page = search.page ?? 1;
const q = (search.q ?? "").trim();

const { data } = useSuspenseQuery(thingsQueryOptions({ page, search: q || undefined }));
const items = data.items;
const totalPages = data.totalPages;
```

- Prefer `useSuspenseQuery` when the route wraps the list in `<Suspense>`.
- Use `useQuery` + `isPending` when the table should show an inline loading state (pass `isLoading` to the table).

### TanStack DB (client-filtered / server-shaped collections)

For query-driven collections (see `ListMovies` in the realworld app):

```tsx
const search = routeApi.useSearch();
const navigate = routeApi.useNavigate();
const page = search.page ?? 1;
const q = (search.q ?? "").trim();

const { data, isLoading } = useLiveQuery(
  (qb) =>
    qb
      .from({ items: queryDrivenCollection })
      .where(({ items }) => and(eq(items.page, page), eq(items.q, q)))
      .orderBy(/* sort from search.sortBy */),
  [page, q, sortBy, sortDirection],
);

const { meta } = useTSDBQueryMeta(COLLECTION_QUERY_KEY, { page, q });
```

- Drive the live query from the **committed** URL `q` (`search.q`), not `inputValue`.
- Sort/filter controls patch search via `navigate({ search: (prev) => ({ ...prev, sortBy }) })`.
- Pagination total comes from collection meta (`meta?.totalPages`), not a client slice.

---

## Reducing useEffect noise

| Smell                                         | Prefer                                            |
| --------------------------------------------- | ------------------------------------------------- |
| Syncing input ↔ URL by hand                   | `usePageSearchQuery`                              |
| Page `navigate` + `useTransition`             | `TSRListPagination`                               |
| `useSearch({ from: routeId as never })` prop  | `getRouteApi(ROUTE_ID)` at module scope           |
| Multiple effects for the same async lifecycle | One effect, or fold into the existing domain hook |
| Effects that only derive render flags         | Compute during render / early returns             |

---

## Route checklist

1. `validateSearch`: `page`, `q`, plus any sort/filter enums.
2. `loaderDeps`: `{ page: search.page, q: search.q }` + prefetch in `loader`.
3. Route file: header, create dialogs, `<Suspense><ListThing /></Suspense>`.
4. List component: `routes/_dashboard/<area>/<page>/-components/List*.tsx` with hardcoded `ROUTE_ID`.
5. `data-test` on the list root, search empty, and primary actions.
6. Empty UI uses shared table empty states or `components/ui/empty` — not one-off cards unless interactive.

---

## Reference implementations

Canonical sources in this repo:

| List                    | Route id                           | Component                                                                 |
| ----------------------- | ---------------------------------- | ------------------------------------------------------------------------- |
| Admin users             | `/_dashboard/admin/users/`         | `routes/_dashboard/admin/users/-components/ListUsers.tsx`                 |
| Manager team            | `/_dashboard/manager/team/`        | `routes/_dashboard/manager/team/-components/ListTeamMembers.tsx`        |
| Admin locations         | `/_dashboard/admin/locations/`     | `routes/_dashboard/admin/locations/-components/ListLocations.tsx`         |
| Manager locations       | `/_dashboard/manager/locations/`   | `routes/_dashboard/manager/locations/-components/ListLocations.tsx`       |

TanStack DB variant (external reference):

- `apps/realworld/src/routes/_dashboard/movies/-components/ListMovies.tsx`

Follow the `getRouteApi` + `SearchBox` + `TSRListPagination` shape for every new list.
