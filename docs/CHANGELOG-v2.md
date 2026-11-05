# Changelog — v2 (`next` branch)

Entries reference item IDs from `AHORRA_V2_PLAN.md` (workspace repo).

## Unreleased

### 0.21g: MSW and tests for `src/lib` and `src/stores`
- MSW 3.0.3 (approved): one shared server in `src/test/msw.ts` (API origin `http://api.test` via `NEXT_PUBLIC_API_URL` in `vitest.config.mts`), a request recorder, `signIn`/`signOut` helpers. Unmocked requests fail the test (`onUnhandledFrame: "error"`, the MSW 3 name; checked by a test).
- `apiFetch`: URL and query building, session headers, JSON vs multipart bodies, 204/empty/non-JSON responses, error mapping, `Retry-After` in seconds and as a date, network failures; `ApiError` defaults per status.
- `swrFetcher` and `apiMutate` (same table): token and household from the stores, one refresh-and-retry on 401, session cleared when the refresh fails, concurrent 401s share one refresh, other errors not retried.
- Every mutation wrapper (method, path, household scoping, body), the tri-state body of `patchInstallment`, `patchMe` validation; auth and support API calls (ticket upload in a node-environment test: undici cannot stream jsdom's `File`); every SWR hook (path, query, scoping, waiting for session, household or id; superadmin-only list); push helpers; schemas; both stores (only `currentId` persisted, token never stored); format and labels; `toastError`; `confirm`; the insights SSE hook with a fake `EventSource`.
- Contract bugs from the audit pinned with `it.fails` (flipped by 0.1): `critical` severity rejected by the insight schema (2); the "Alertas" filter hides the API's `alert` insights (3, component test); `transferHouseholdOwnership` typed as returning a member while the API answers 204 (8).
- Coverage: `src/lib` + `src/stores` 99% lines / 95% statements / 83% branches (whole app 22%, components mostly untested; plan target is `lib` + `stores` ≥ 70%).
- `coverage/` ignored by ESLint.

### 0.21g (first part) — Vitest harness; fix onboarding flash after login
- Test stack: Vitest 5.1, Testing Library (react/dom/user-event/jest-dom), jsdom, `@vitejs/plugin-react`. `pnpm test`, `pnpm test:watch`, `pnpm test:coverage`; `pnpm check` and CI run the tests. TZ fixed to `America/Argentina/Buenos_Aires`.
- **Bug fixed:** logging in with the form showed /onboarding for a moment and then jumped home. The user was set before their households were fetched, and "households not loaded yet" was treated as "no household". The household store now records `resolvedFor` (the user whose households were reconciled, not persisted); `AuthGate` and the onboarding page keep the loading screen until it matches the logged-in user, then decide. The verify-email page always goes to `/` and lets `AuthGate` decide. Silent token refreshes no longer refetch households.
- Regression tests: `auth-gate.test.tsx` (5) and `onboarding/page.test.tsx` (3); they fail on the previous code.

### 0.19 — Security: patch vulnerable dependencies
- `pnpm audit --prod` found 57 advisories (5 critical, 30 high), mostly in Next.js 16.2.4, including **unauthenticated remote code execution** (Image Optimization with AVIF/SVG, `next/og` ImageResponse used by `app/opengraph-image.tsx`, `use cache`), SSRF and DoS. 0.15c had only audited the API.
- Next 16.2.4 → 16.4.5 (+ `eslint-config-next`), React/React DOM 19.2.4 → 19.2.9 (patch), Serwist 9.5.7 → 9.5.13, zod 4.6.7; vulnerable transitive deps refreshed in the lockfile.
- `pnpm-workspace.yaml` overrides (same major) for build-time transitive deps pinned by their parents: browserslist, baseline-browser-mapping, @babel/core, zod (inside `@serwist/build`). `minimumReleaseAgeExclude` lists only the two patched versions newer than pnpm's release-age window.
- Remaining: 2 moderate (glob 13 / minimatch 10 inside `@serwist/build`, build-time only, fix needs a major); accepted until Serwist updates.
- Next 16.4 removed `experimental.viewTransition`: React `<ViewTransition>` works in the App Router without a flag, so the option is gone from `next.config.ts`.
- Verified: lint, `tsc`, `next build`, standalone server serves `/`, `/login`, `/opengraph-image` (PNG), manifest and `sw.js`.

### 0.11 + 0.19 — CI
- `.github/workflows/ci.yml` (push to `next` + PRs into it): `pnpm install --frozen-lockfile`, lint, typecheck, build, `pnpm audit --prod --audit-level high`, gitleaks on full history. Actions pinned by commit SHA.
- Dependabot weekly for npm, Dockerfile and Actions, targeting `next`.
- `pnpm check` / `pnpm typecheck` scripts mirror CI locally. Vitest/Playwright arrive in 0.21.

### 0.15c — Toolchain refresh
- Docker base `node:24.22.2-alpine3.24` (was alpine3.23). Image builds; note `NEXT_PUBLIC_APP_URL` is required at build time (empty value breaks `metadataBase`, tracked for 0.13).

### 0.15a — Hygiene, no behavior change
- Stop tracking generated `public/sw.js` and per-machine `.claude/settings.local.json` (both git-ignored).
- Pin Node 24 LTS: `.nvmrc`, `engines.node >=24`, Docker base `node:24.22.2-alpine3.23` (was floating `node:22-alpine`); `@types/node` ^24.
- Move `shadcn` (CLI) to devDependencies.
- Document `NEXT_PUBLIC_GOOGLE_CLIENT_ID` in `.env.example`, Dockerfile build args and `DEPLOY.md`.
- README: correct Node/pnpm prerequisites, dev port 3005, API folder name, SWR key description.
- Lint green: derive the reduced-motion text in `lemy-logo.tsx` instead of `setState` in an effect; drop an unused prop and redundant `eslint-disable` comments.
- Add `docs/design/screen-inventory.md` (current-UI audit, reference for 1.10).
