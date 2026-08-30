
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

This project is using Vite+, a unified toolchain built on top of Vite, Rolldown, Vitest, tsdown, Oxlint, Oxfmt, and Vite Task. Vite+ wraps runtime management, package management, and frontend tooling in a single global CLI called `vp`. Vite+ is distinct from Vite, and it invokes Vite through `vp dev` and `vp build`. Run `vp help` to print a list of commands and `vp <command> --help` for information about a specific command.

Docs are local at `node_modules/vite-plus/docs` or online at https://viteplus.dev/guide/.

## Built-in Commands vs Scripts

`vp <name>` runs a built-in command. `vp run <name>` runs a `package.json` script or a `vite.config.ts` task. Scripts cannot overwrite built-ins, so `vp dev` and `vp run dev` may do different things. Check `package.json` and `vite.config.ts` first, and run `vp run <name>` when the project defines a script or task with that name.

## Tool Versions

Run `vp toolchain` to show versions and relationships in the active Vite+
release. Add a tool name to select part of the graph. For example, run
`vp toolchain vite`. Use `--global` to ignore the local `vite-plus` package. Use
`vp why <package>` to show the package-manager dependency graph.

## Review Checklist

- [ ] Run `vp install` after pulling remote changes and before getting started.
- [ ] Run `vp check` and `vp test` to format, lint, type check and test changes.
- [ ] Check if there are `vite.config.ts` tasks or `package.json` scripts necessary for validation, run via `vp run <script>`.
- [ ] If setup, runtime, or package-manager behavior looks wrong, run `vp env doctor` and include its output when asking for help.

<!--VITE PLUS END-->

# Conventions

**Code:** `@/` imports. `satisfies` for checks. Route logic stays in the route file; reusable logic in hooks. Comment only novel/unusual code.

**Drizzle:** Types flow from the schema (`typeof table.$inferSelect` / `$inferInsert`) and from the query itself — do not invent row types or annotate functions with a hardcoded return type. Prefer relational `db.query` with `with` when you want joined data nested; `select` + `join` flattens rows into pieces. Keep filters, sorts, aggregates, and grouping in Drizzle, not a JS loop after fetch. Do not write whole queries with the `sql` tagged template — that drops the type-safety the query builder is for; `sql` is for tiny expressions (defaults, fragments), not the query. `mappedRow` / `mapRow` helpers are a vibe-coding smell: if the query is shaped right, the result is already the type. JS transforms are an exception only when the SQL would be genuinely too complex, and never over many rows.

**Control flow:** Prefer early returns over nested `if`s and JSX ternary soup. Guard pending/empty/error first, then render the happy path. One-line `cond ? a : b` is fine; stacked `x ? a : y ? b : c` in JSX is not — extract a helper or early-return.

**Lists / search / pagination:** Follow `docs/paginated-list-pattern.md` (`getRouteApi`, `usePageSearchQuery`, `SearchBox`, `TSRListPagination`). Thin route (header + actions + `<Suspense>`), list in `-components/List*.tsx`. Fetch from committed URL `page`/`q`, not the live input. Shared utilities over hand-rolled `useEffect` + `navigate`. Put defaults on the route `validateSearch` schema (`page`, `perPage`, `sq`/`q`) — do not re-default in the list (`search.page ?? 1`). After parse, use `search.page`, `search.perPage`, and `search.sq.trim()` directly. Put defaults on the route `validateSearch` schema (`page`, `perPage`, `sq`/`q`) — do not re-default in the list (`search.page ?? 1`). After parse, use `search.page`, `search.perPage`, and `search.sq.trim()` directly.

**UI:** shadcn only. DaisyUI is limited to theme utilities, button classes, or tiny standalone bits with no serious a11y needs. Theme tokens, no hardcoded colors. Responsive (`md:`, `lg:`) plus container queries when a sidebar can change the viewport.

**Files:** Route-specific UI lives in that route’s `-components/` folder, not global `components/` and not inline in the route file.
