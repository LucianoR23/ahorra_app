# Ahorra — Personal Finance PWA

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
- SWR keys include `currentHouseholdId` so cache invalidates automatically on household switch
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

**Prerequisites:** Node 20, pnpm, Go 1.25+, Docker

```bash
# 1. Clone and install
git clone <repo>
cd ahorra_app
pnpm install

# 2. Environment
cp .env.example .env.local
# Set NEXT_PUBLIC_API_URL=http://localhost:8080

# 3. Start database (port 5433 to avoid conflicts)
docker-compose up -d

# 4. Run backend
cd ../api_go_ahorra
go run ./cmd/api/main.go

# 5. Run frontend
pnpm dev   # http://localhost:3000
```

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
ALLOWED_ORIGINS=http://localhost:3000
VAPID_PUBLIC_KEY=<generated>
VAPID_PRIVATE_KEY=<generated>
VAPID_SUBJECT=mailto:you@example.com
RESEND_API_KEY=<optional>
BLUELYTICS_ENABLED=true
```
