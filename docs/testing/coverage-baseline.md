# Coverage baseline (front end)

Starting point of the coverage ratchet (plan §0 "Coverage gates — ratchet",
item 0.21i). Measured on 2026-11-05 on `next` after the 0.21 test backfill,
with `pnpm test:coverage` (Vitest, V8 provider).

## Scope

Coverage includes `src/lib/**`, `src/stores/**` and `src/components/**`
(`vitest.config.mts`). The plan's target is `src/lib` + `src/stores` ≥ 70%;
components and pages are covered mostly by the E2E (Playwright, 3 flows, which
do not report coverage) and will get component tests as they change (1.10).

## Numbers

| Scope | Statements | Branches | Functions | Lines |
|---|---|---|---|---|
| Before 0.21 | no unit tests | | | |
| `src/lib` + `src/stores` | 94.9% | 82.8% | 98.1% | 99.0% |
| Everything measured (incl. components) | 23.5% | 16.3% | 24.2% | 24.0% |

## Floors (`coverage.thresholds` in `vitest.config.mts`)

| Scope | Statements | Branches | Functions | Lines |
|---|---|---|---|---|
| `src/lib/**`, `src/stores/**` | 94 | 82 | 97 | 98 |
| Global | 22 | 15 | 23 | 23 |

`pnpm check` and CI run `pnpm test:coverage`, which fails below any floor.
Raise the floors in the PR that raises coverage (keep about one point of
headroom); never lower them.

## Known bugs pinned

Contract bugs from the audit are `it.fails` tests (they pass while the bug
reproduces and fail once fixed): insight severity `critical` (bug 2),
"Alertas" filter (bug 3), `transferHouseholdOwnership` typing (bug 8). All are
fixed by plan item 0.1.
