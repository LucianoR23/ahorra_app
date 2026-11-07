# Valuo (formerly Ahorra): personal finance PWA

A full-stack personal finance app for individuals and shared households. Track expenses, incomes, goals, and debts with real-time multi-currency support, AI-generated insights, and Web Push notifications.

**Live:** [ahorra.lemydev.com](https://ahorra.lemydev.com)

---

## Features

- **Multi-household** — belong to multiple households simultaneously; each has isolated budgets, categories, and members
- **Expenses & Incomes** — single/recurring entries with installments, category tagging, and payment method tracking
- **Shared expenses** — automatic cost-splitting by configurable member weights or manual per-entry override
- **Budget goals** — category or total limits with real-time progress (`on_track → warning → exceeded`)
- **Debt settlements** — pairwise balance matrix; record payoffs between household members
- **AI insights** — automated daily/weekly summaries generated at 01:00 and triggered on demand
- **AI export** — compact JSON snapshot + pre-built LLM prompt for external analysis
- **Reports** — monthly breakdown (spent/billed/due), fixed vs. variable, 6-month trends
- **Multi-currency** — ARS/USD/EUR with live exchange rates (Bluelytics blue rates, refreshed every 15 min)
- **Credit card management** — closing/due days per card with per-month period overrides
- **Web Push notifications** — VAPID-based alerts for shared expenses, settlements, and household invites
- **PWA** — installable, offline-capable via Serwist service worker with precaching

---

## Tech Stack

### Frontend

| | |
|---|---|
| Framework | Next.js 16 (App Router) + React 19 + TypeScript 5 |
| Styling | Tailwind CSS 4 + shadcn/ui (base-mira) |
| State | Zustand 5 (auth + household context) |
| Data fetching | SWR 2 with custom apiFetch client |
| Validation | Zod 4 |
| Charts | Recharts 3 |
| PWA | Serwist 9 (`@serwist/next`) |
| Compiler | React Compiler (Babel plugin — automatic memoization) |
| Build output | Standalone Docker image (no `node_modules` at runtime) |

### Backend

| | |
|---|---|
| Language | Go 1.25+ |
| Router | chi |
| Database | PostgreSQL 17 |
| Query layer | sqlc + pgx/v5 (type-safe, no ORM) |
| Migrations | golang-migrate |
| Auth | JWT (15-min access token in memory) + rotative httpOnly refresh cookie (7 d) |
| Background jobs | Goroutines + `time.Ticker` (recurring generation, insights, exchange rates) |
| Email | Resend API |
| Rate limiting | `golang.org/x/time/rate` (per-IP, in-memory) |
| Logging | `slog` (structured JSON) |

### Infrastructure

| | |
|---|---|
| Deployment | Coolify on Oracle ARM VPS |
| Reverse proxy | Traefik (auto HTTPS via Let's Encrypt) |
| Containers | Multi-stage Docker builds |

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│  Next.js PWA (ahorra.lemydev.com)                        │
│  App Router · Zustand · SWR · Zod · Serwist SW           │
└──────────────────┬───────────────────────────────────────┘
                   │ HTTPS · X-Household-ID header
┌──────────────────▼───────────────────────────────────────┐
│  Go REST API (api-ahorra.lemydev.com)                    │
│  chi · sqlc · JWT auth · VAPID push · Worker goroutines  │
└──────────────────┬───────────────────────────────────────┘
                   │
┌──────────────────▼───────────────────────────────────────┐
│  PostgreSQL 17                                           │
│  20+ tables · migrations · type-safe query layer         │
└──────────────────────────────────────────────────────────┘
```

**Key patterns:**
- All API requests are scoped by `X-Household-ID` header; missing header returns 400 for household-scoped routes
- Access token lives in Zustand (memory only); `AuthBootstrap` calls `POST /auth/refresh` on mount to hydrate it from the httpOnly cookie — zero tokens in `localStorage`
- SWR keys are `[path, {query, householdScoped}]`; the household goes in the `X-Household-ID` header, and the whole cache is invalidated on household switch
- `apiMutate` auto-retries on 401 with a fresh token before failing — transparent token refresh for all mutations
- Background worker runs in the same Go process: three goroutines (`recurring`, `insights`, `rates`) with independent tickers — no Redis or external queue required

---

## Project Structure

```
src/
├── app/               # App Router pages (movimientos, ingresos, deudas, objetivos, reportes…)
├── components/
│   ├── ui/            # shadcn/ui base components
│   └── …              # Feature components (expense-form, goals-manager, push-provider…)
├── stores/            # Zustand stores (auth.ts, household.ts)
└── lib/
    ├── api/           # client.ts · mutations.ts · hooks.ts · schemas.ts · errors.ts
    ├── format.ts      # fmtARS, greeting()
    └── push.ts        # VAPID subscription helpers
```

---

## Local Development

**Prerequisites:** Node 24 (see `.nvmrc`), pnpm via corepack (version pinned in `packageManager`), Go (see the API's `go.mod`), Docker

```bash
# 1. Clone and install
git clone <repo>
cd ahorra_app
corepack pnpm install

# 2. Environment
cp .env.example .env.local
# Set NEXT_PUBLIC_API_URL=http://localhost:8080

# 3. Start database and backend (in ../api_go_ahorro; Postgres on port 5433)
cd ../api_go_ahorro
docker compose up -d
go run ./cmd/api
cd ../ahorra_app

# 4. Run frontend
corepack pnpm dev   # http://localhost:3005
```

**Before pushing:** `corepack pnpm check` runs what CI runs (lint, typecheck, unit tests, build, `pnpm audit --prod --audit-level high`). CI (`.github/workflows/ci.yml`) also scans the git history with gitleaks and, on PRs, runs the E2E. Dependabot opens weekly update PRs against `next`.

### Tests

- **Unit and component (Vitest):** `corepack pnpm test` (`test:watch`, `test:coverage`). The API is mocked with MSW (`src/test/msw.ts`); a request without a handler fails the test.
- **E2E (Playwright):** `corepack pnpm test:e2e` starts the API (`go run ./cmd/api` in `../api_go_ahorro`, migrating on start) and the app, against the database in `E2E_DATABASE_URL` (default `postgres://postgres:postgres@localhost:5433/ahorra_e2e`, which must exist and be disposable; never your dev data). Ports 8080 and 3005 must be free, or the running servers are reused. First time: `corepack pnpm exec playwright install chromium`.
  - Flows covered (plan 0.21h): sign up → household → session kept on reload → log in again; an expense in installments shared with the household reaching the balances; a variable monthly bill confirmed from its draft.
  - In CI the API (branch `next`) is checked out with a read-only deploy key (secret `API_DEPLOY_KEY`).

---

## Brand

The product name, tagline and description live in `src/config/brand.ts` (defaults to Valuo; `NEXT_PUBLIC_BRAND_*` override them at build time). Logos, icons and design tokens are a vendored copy of the workspace brand kit (`valuo_workspace/brand`), never edited here:

- `pnpm brand:sync` copies the kit from `../brand`: tokens and docs into `brand/`, logos/icons/PNGs into `public/brand/` (served as `/brand/...`), favicon and apple icon into `src/app/`. It records the workspace commit in `brand/VERSION` and the file hashes in `brand/manifest.json`, and refuses to run with uncommitted brand changes in the workspace.
- `pnpm brand:check` (part of `pnpm check`) fails if a vendored file differs from the manifest.

---

## Auth Flow

```
App mount
  └─► AuthBootstrap → POST /auth/refresh
        ├─ cookie valid → access token in Zustand → render app
        └─ cookie invalid → redirect to /login

API call with expired token
  └─► apiFetch returns 401
        └─► apiMutate refreshes token → retries original request
```

Refresh tokens rotate on every use. Logout calls `POST /auth/logout` which clears the httpOnly cookie server-side.

---

## Background Jobs

| Job | Schedule | Purpose |
|-----|----------|---------|
| `recurring` | 00:30 daily | Generate expense/income instances from active templates |
| `insights` | 01:00 daily | AI-style summaries, goal alerts, weekly reviews |
| `rates` | Every 15 min | Fetch USD/EUR blue rates from Bluelytics |
| `monthly-report` | 1st of month | Email report via Resend |

---

## Environment Variables

### Frontend (`.env.local`)

```env
NEXT_PUBLIC_API_URL=https://api-ahorra.lemydev.com
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<from backend>
```

### Backend (`.env`)

```env
DATABASE_URL=postgresql://ahorra:password@localhost:5433/ahorra
JWT_SECRET=<32+ chars>
JWT_REFRESH_SECRET=<32+ chars>
ALLOWED_ORIGINS=http://localhost:3005
VAPID_PUBLIC_KEY=<generated>
VAPID_PRIVATE_KEY=<generated>
VAPID_SUBJECT=mailto:you@example.com
RESEND_API_KEY=<optional>
BLUELYTICS_ENABLED=true
```
