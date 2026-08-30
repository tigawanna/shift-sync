# ShiftSync

Multi-location staff scheduling platform for **Coastal Eats** — a fictional restaurant group with **4 locations** across **2 time zones**.

| Package | Path | Purpose |
|---------|------|---------|
| `web` | `apps/web` | ShiftSync web app (TanStack Start, Drizzle, Turso) |

## Stack

- **TanStack** — Router, Query, Start (SSR via Nitro)
- **Drizzle ORM** — schema, migrations, type-safe queries
- **Turso** — libSQL database (local `file:./data/shift-sync.db` in dev, remote in production)
- **Vercel** — deployment target

## Prerequisites

- Node.js >= 20
- pnpm 9

## Getting started

```bash
pnpm install
cp apps/web/.env.example apps/web/.env
pnpm dev
```

The web app runs at http://localhost:3090. Auth origin must stay **`http://localhost:3090`** (`BETTER_AUTH_URL` / `CORS_ORIGINS`). A second Vite port (3091) will fail Better Auth with “Invalid origin”.

### Database

Local development uses a SQLite file at `apps/web/data/shift-sync.db`. Migrations run automatically on server start locally, or apply them manually:

```bash
pnpm --filter web db:migrate
```

Seed the demo roster once:

```bash
pnpm --filter web db:seed
```

For production Turso, set `DATABASE_URL` (`libsql://…`) and `DATABASE_AUTH_TOKEN` in your Vercel project environment variables.

Password for every seed account: **`CoastalEats!seed`**

### Log in as each role

Easiest path: sign in at `/auth`, then as admin **Impersonate** from Staff / Managers / Admins lists.

| Role | Email | What to open |
| --- | --- | --- |
| Admin | `admin@coastaleats.test` | `/admin`, `/admin/schedules`, `/admin/audit` |
| Manager | `manager-001@costal-eats.com` … `manager-008@costal-eats.com` | `/manager/schedule`, `/manager/requests`, `/manager/team` |
| Staff | `staff-001@costal-eats.com` … `staff-041@costal-eats.com` | `/staff` calendar + coverage under it |

Emails use `costal-eats.com` (seed spelling), except the admin account.

**Staff 41** (`staff-041@costal-eats.com`) is the overtime / timezone fixture: certified at Harbor House + Pier 39 (Pacific) and Atlantic Table (Eastern), desired hours **25**, overlapping seed shifts across sites. Use calendar `?month=` for a seeded week (often **2026-08**).

Locations: Harbor House and Pier 39 Bistro (`America/Los_Angeles`); Atlantic Table and Harbor Light (`America/New_York`).

### Evaluation scenarios

1. **Sunday night chaos** — Staff: drop the shift. Another staff: pick it up. Manager **Coverage** (`/manager/requests`): approve. Assignment does not move until approve.
2. **Overtime trap** — Impersonate Staff 41; week hours include every location. As a manager of Harbor House or Pier 39, open that week: labor table, OT on bars, assign sheet “would be Xh”.
3. **Timezone tangle** — Availability is matched in the **shift location** timezone, not the browser. Staff 41’s “9–5” is 9–5 Pacific at Pier 39 and 9–5 Eastern at Atlantic Table.
4. **Simultaneous assignment** — Two managers assigning the same person to overlapping times: the write re-reads overlaps in a transaction and rejects the second with a double-booking error.
5. **Fairness complaint** — Manager week board: **Premium** on Fri/Sat starts at 16:00 local. Labor report: premium counts + fairness score 0–100.
6. **Regret swap** — Staff A withdraws before manager approval. After approval, A cannot withdraw; a later shift edit does not unwind the swap (see assumptions below).

Role checklist: [docs/objectives.md](./docs/objectives.md). Full decision notes: [docs/requirements.md](./docs/requirements.md).

### Known limitations

- “Email” is a flag on the notification row, not SMTP.
- Live updates are a **15s refetch**, not websockets.
- Admin schedules are oversight (who works where, labor, on duty), not the manager edit board.
- Concurrent assign integrity is a transaction re-check on SQLite, not an exclusion constraint.

### Assumptions (ambiguous requirements)

The brief left these unspecified. Choices in the product:

| Question | Decision |
| --- | --- |
| Historical data after de-certification | Cert removal does not rewrite `shift` / `shift_assignment`. Staff calendar only shows locations they are still certified for. Managers cannot assign them there again. |
| Desired hours vs availability | Separate. Availability is *when* they can work; desired hours is a weekly target. Unset week = no target. Desired hours does not change assign eligibility. Empty weekly windows = open except blocked exceptions. |
| Consecutive days (1h vs 11h) | Any assigned time on a civil date in the location week counts as a worked day. Overnight hours that land on a date count for that date. |
| Edit after swap approval | Approval already moved the assignment. Later edit is a normal shift edit (48h cutoff still applies). Current assignee stays. Pending (not-yet-approved) swap/drop on that shift is cancelled and parties are notified. The approved swap is not unwound. |
| Location spanning a timezone boundary | One IANA timezone per location. Shifts, availability, overnight splits, and weekly hours use that stored zone — not the browser and not a second zone for a nearby state. |

Also: 40h is over the weekly limit with a confirm, not a hard assign block (12h daily is a hard block). OT is projected at **$22/h × 1.5** over 40h, summing hours at every location. Premium is Fri/Sat start at **16:00** location-local. Audit export uses Coastal Eats HQ dates (`America/Los_Angeles`).

## Deploy to Vercel

1. Import the repo in Vercel and set the root directory to `apps/web`
2. Framework preset: **TanStack Start** (auto-detected when Nitro is configured)
3. Add environment variables from `.env.example`
4. Deploy

Or use the CLI from `apps/web`:

```bash
pnpm build
vercel deploy
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start web dev server |
| `pnpm build` | Production build |
| `pnpm check-types` | TypeScript check |
| `pnpm lint` | Oxlint |
| `pnpm format` | Prettier write |
| `pnpm format:check` | Prettier check |
| `pnpm test:e2e` | Playwright e2e tests |

## Project scope

ShiftSync handles real-world workforce scheduling complexity — multi-location coverage, time zones, manager workflows, and staff visibility — while staying intuitive for both managers and staff.
