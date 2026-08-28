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

The web app runs at http://localhost:3090.

### Database

Local development uses a SQLite file at `apps/web/data/shift-sync.db`. Migrations run automatically on server start locally, or apply them manually:

```bash
pnpm --filter web db:migrate
```

For production Turso, set `DATABASE_URL` (`libsql://…`) and `DATABASE_AUTH_TOKEN` in your Vercel project environment variables.

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
