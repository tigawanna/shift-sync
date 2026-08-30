
For domain specifc questins check out the requiremnets in 
- docs/paginated-list-pattern.md
and check off the progreess in 
- docs/objectives.md

<!-- intent-skills:start -->
## Skill Loading

Before editing files for a substantial task:
- Run `pnpm dlx @tanstack/intent@latest list` from the workspace root to see available local skills.
- If a listed skill matches the task, run `pnpm dlx @tanstack/intent@latest load <package>#<skill>` before changing files.
- Use the loaded `SKILL.md` guidance while making the change.
- Monorepos: when working across packages, run the skill check from the workspace root and prefer the local skill for the package being changed.
- Multiple matches: prefer the most specific local skill for the package or concern you are changing; load additional skills only when the task spans multiple packages or concerns.
<!-- intent-skills:end -->



<!--VITE PLUS START-->
# Using Vite+, the Unified Toolchain for the Web
Run `vp toolchain` to show versions and relationships in the active Vite+
release. Add a tool name to select part of the graph. For example, run
`vp toolchain vite`. Use `--global` to ignore the local `vite-plus` package. Use
`vp why <package>` to show the package-manager dependency graph.
<!--VITE PLUS END-->

# Conventions

**Code:** `@/` imports. `satisfies` for checks. Route logic stays in the route file; reusable logic in hooks. Comment only novel/unusual code.

**Drizzle:** Types flow from the schema (`typeof table.$inferSelect` / `$inferInsert`) and from the query itself — do not invent row types or annotate functions with a hardcoded return type. Prefer relational `db.query` with `with` when you want joined data nested; `select` + `join` flattens rows into pieces. Keep filters, sorts, aggregates, and grouping in Drizzle, not a JS loop after fetch. Do not write whole queries with the `sql` tagged template — that drops the type-safety the query builder is for; `sql` is for tiny expressions (defaults, fragments), not the query. `mappedRow` / `mapRow` helpers are a vibe-coding smell: if the query is shaped right, the result is already the type. JS transforms are an exception only when the SQL would be genuinely too complex, and never over many rows.

**Control flow:** Prefer early returns over nested `if`s and JSX ternary soup. Guard pending/empty/error first, then render the happy path. One-line `cond ? a : b` is fine; stacked `x ? a : y ? b : c` in JSX is not — extract a helper or early-return.

**Lists / search / pagination:** Follow `docs/paginated-list-pattern.md` (`getRouteApi`, `usePageSearchQuery`, `SearchBox`, `TSRListPagination`). Thin route (header + actions + `<Suspense>`), list in `-components/List*.tsx`. Fetch from committed URL `page`/`q`, not the live input. Shared utilities over hand-rolled `useEffect` + `navigate`.

**UI:** shadcn only. DaisyUI is limited to theme utilities, button classes, or tiny standalone bits with no serious a11y needs. Theme tokens, no hardcoded colors. Responsive (`md:`, `lg:`) plus container queries when a sidebar can change the viewport.

**Files:** Route-specific UI lives in that route’s `-components/` folder, not global `components/` and not inline in the route file.
