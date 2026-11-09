# Changelog — v2 (`next` branch)

Entries reference item IDs from `AHORRA_V2_PLAN.md` (workspace repo).

## Unreleased

### 4.1 (app part): credit card statements
- Tarjetas starts with the statements (design `Tarjetas`): a card picker when there is more than one credit card, "Resumen a pagar" (the period before the open one) with its total per currency, closing and due dates, status, "Marcar como pagado" and "Ver detalle", and "Próximo resumen" with what it has so far. Without credit cards it invites to add one.
- New `/tarjetas/[id]/resumen/[ym]`: month navigator, total, minimum payment (in pesos), pay or unmark the payment, the installments with the space they belong to (Mi plata or the Hogar), and the adjustments (interest, taxes, fees, credits, other) to add, edit or delete.
- "Marcar como pagado" proposes the total and accepts what was actually paid; every installment of the statement is marked paid either way.
- `src/lib/statements.ts` (labels, date lines, which statement is to pay), schemas, hooks and mutations for the statements API. E2E spec `card-statements.spec.ts`; the screenshot harness adds a card with a closed statement and the statement screen.

### 1.9 (part 2): amounts in push notifications, per device
- Push notifications show no amount by default, since they can appear on a locked screen (API 1.9 sends `body` without amounts and `bodyWithAmounts` with them). Seguridad, "Privacidad en este dispositivo", gains "Montos en las notificaciones" to opt in on this device.
- The choice lives in IndexedDB (`app.device`), which the service worker can read; `src/lib/push-amounts.ts` holds the read/write and `pushBody()`. If IndexedDB fails, pushes stay without amounts.

### 1.9 (part 1): discreet mode
- One tap on the eye in Inicio hides every amount in the app as `$ ••••••` (fixed length, so it doesn't hint at the size), with `aria-label="Monto oculto"` and the toast from the design. It is a per-device choice (localStorage `app.discreet`) and can also be switched in Seguridad, "Privacidad en este dispositivo".
- Every amount now goes through `<Money>` or `useFormatAmount()` (`src/stores/discreet.ts`): the 71 uses of `fmtARS`/`fmtMoney` moved over and both are gone. A lint rule forbids importing `formatAmount` anywhere else, so a new screen can't leak an amount. Side effect, per design README §6: amounts read `$ 128.450,50` (space after the symbol, cents only when there are any) and expenses carry no "−" sign; `formatAmount` gained `compact` (`$ 12,5k`).
- Charts stay (they are proportions) but lose their axis numbers, and their tooltips are masked. Notification titles and bodies mask the amounts the API writes in them.
- Amount inputs stay visible while you type.

### Maintenance: dependencies (2026-11-08)
- Dev tools (PR #27): shadcn CLI 4.3 → 4.23, tailwindcss and @tailwindcss/postcss 4.2 → 4.3.5, eslint 9.39.5. `pnpm audit` over all dependencies went from 80 advisories (28 high, 1 critical) to 3 with no usable fix, documented in `pnpm-workspace.yaml`. CI and `pnpm check` now fail on high/critical advisories in dev dependencies too.
- Runtime, within range: @base-ui/react 1.4 → 1.9, lucide-react 1.8 → 1.70 (some icons are redrawn, e.g. the credit card), recharts 3.10.1, swr 2.5.1, zustand 5.1, date-fns 4.4, sonner 2.0.8, tailwind-merge 3.7, React types 19.3. Screenshot harness reviewed: only icon drawings change.
- eslint stays on 9 for now: eslint 10 lints this codebase fine, but eslint-plugin-react, -import and -jsx-a11y (pulled by eslint-config-next 16.4.5) don't declare support for it yet.

### 1.4 (app part): Argentine categories
- Subcategories: every category picker (new expense, recurring, goal, expense detail, the Movimientos filter) uses the new `CategorySelect`, which lists each category followed by its subcategories, indented. Filtering Movimientos by a parent also shows its subcategories' expenses (API side).
- Categorías lists each category with its subcategories under it. The form has "Dentro de" to pick a top-level parent or none; a category that has subcategories can't go inside another one. Deleting a parent warns that its subcategories become top-level categories.
- Icons are keys only: the emoji map is gone (the API migrated stored emojis). Seven icons were added for the new defaults: SUBE, Taxi, Alquiler, Hogar, Gas, Agua, Salud.
- `categorySchema.parentId` and `CategoryInput.parentId`.
- The full-flow onboarding test gets its own 30 s timeout: under coverage it could pass the global 15 s.

### 1.3: new onboarding
- `/onboarding` is rebuilt in the new design: name → "¿Cómo pagás?" (Visa, Mastercard, American Express, Mercado Pago, Efectivo o débito) → bank, closing and due day for each card → first expense with the regular form (natural language comes in 3.1). Every step can be skipped.
- Cards are network × bank: the name defaults to "<Network> <Bank>" and can be changed; the bank comes from the user's banks or an Argentine list (created when missing, "Otro" for any other). The current statement is computed from the two days. Mercado Pago becomes a wallet and asks whether the user also has its credit card (then a Mastercard Mercado Pago card). "Efectivo o débito" adds a "Débito" ("Efectivo" exists from sign-up). Re-entering after a failure does not duplicate what was saved.
- Users without `onboardedAt` (API 1.3) are sent there; the first expense or skipping it marks onboarding done. After the first expense the app asks for push permission (where the browser can) and shows how to install it (the browser's prompt, or the steps for iPhone).
- The old "Creá tu hogar" onboarding is gone: a hogar is created from Más (design rule: never inside onboarding).
- Each step calls `track()` (`src/lib/track.ts`), a no-op until analytics land in 13.3.
- New `components/ui/check-card` (whole-row checkbox). `ExpenseForm` takes `onCreated` to replace the jump to the expense's detail.
- E2E: API-registered users complete onboarding through the API; the sign-up test goes through it in the UI. The screenshot harness adds the onboarding steps (mobile, light and dark).

### 1.10a: redesign foundation
- Theme from the brand: `globals.css` imports the vendored `brand/tokens.css` and maps the shadcn variables to it, so light and dark come from `brand/tokens.json`. New utilities with the brand names (`bg-surface-2`, `text-ink-muted`, `bg-brand` for the amber, `text-on-brand`, `text-title`, `text-body`, ...), radii 8/14/22, `shadow-sheet`, chart tokens. The old names stay as aliases until 1.10b. Manrope replaces Geist.
- The theme follows the OS; "Apariencia" in Ajustes overrides it (Sistema, Claro, Oscuro). The header theme toggles are gone; the toaster follows the chosen theme.
- Lucide is the only icon library (hugeicons removed). Categories show Lucide icons: the editor picks from an icon grid and saves its key; older categories that store an emoji map to an icon when shown (`src/lib/category-icons.ts`; 1.4 migrates the data).
- `components/ui` per the design components sheet: pill buttons (48 px), 48 px fields with a strong border and focus ring, cards with shadow in light and border in dark, badge, switch, dialog and bottom sheet. New: checkbox, popover, alert, empty-state, result-card, page-header, month-navigator, list-row (+ skeleton, installment bar), menu-list, segmented, money and date-label, with `formatAmount` ("$ 128.450,50", "US$", "+" for incomes) and `dayLabel` ("Hoy", "Ayer", "Lun 2", "3/12").
- New shell: bottom nav Inicio · Movimientos · + · Tarjetas · Más on mobile, sidebar with "Cargar gasto" on desktop, content up to 1120 px. "Más" is a page with grouped links (Tu plata, Hogar, Cuenta) and "Cerrar sesión". Card setup moved to `/tarjetas`, the hogar to `/hogar` (creating one at `/hogar/nuevo`); Ajustes keeps profile and appearance.
- Type is never below 12 px. `src/test/design-rules.test.ts` keeps it that way and forbids emojis, other icon libraries and native controls (the two native checkboxes are now `ui/checkbox`).
- `tailwind-merge` knows the brand type scale: before, `text-body` removed the text color next to it (black text on the black button).
- Screenshot harness: `pnpm test:screens` (Playwright project `screens`) saves every screen in light/dark, mobile/desktop; CI uploads them as an artifact. Pixel comparison comes in 1.10b.
- Design handoff copied to `docs/design/app`.

### 1.2 (app part): "Mi plata" + Hogar
- Everyone starts in "Mi plata" (the API creates it). The household dropdown is gone; with a hogar, a "Yo · Hogar" selector (new `components/ui/tabs.tsx`, on Base UI Tabs) switches the space every screen reads (`src/lib/spaces.ts`). Without a hogar there is no household UI: no tabs, no "Deudas" in the menu.
- Add expense: a "Compartido" switch, only with a hogar, remembered per device (`app.expense_shared`). Off: the expense goes to "Mi plata". On: to the hogar with its split rules (custom split still available). Categories follow the chosen space. After saving, the app shows the space the expense went to.
- Settings show the hogar's configuration and split rules from either tab, or a "Crear hogar" card. Leaving or deleting the hogar goes back to "Mi plata". "Deudas" from "Mi plata" offers "Ir al hogar" (or "Crear hogar").
- New users land on the home screen, not on onboarding; creating a hogar is optional ("Ahora no" on that screen) and lives in settings. Onboarding redirects only users who already have a hogar.
- Reads and writes can target a household other than the current one (`householdId` in SWR keys and `apiMutate`), used by the expense form and the hogar settings.
- e2e: sign-up lands in "Mi plata" and creates a hogar from settings; the shared expense uses "Compartido"; the bill test switches to the hogar tab.

### 1.1 (app part): brand switch to Valuo
- Default brand values are now Valuo: name "Valuo", tagline "Sabé cuánto vale tu mes", description "Gastos, tarjetas y cuotas, solo o en hogar." The title reads "Valuo · Sabé cuánto vale tu mes". `NEXT_PUBLIC_BRAND_*` still override them.
- The brand kit is vendored from the workspace by `pnpm brand:sync` (`scripts/sync-brand.mjs`): tokens and docs in `brand/`, logos, icons and PNGs in `public/brand/`, favicon and apple icon in `src/app/`. `pnpm brand:check` runs first in `pnpm check`.
- Logo (`BrandLogo`), favicon, apple icon, manifest icons and push notification icons come from the kit. The old Ahorra assets (`public/pwa`, `public/favicon`, the logo SVGs in `public/svg`) are gone. The layout no longer lists icons by hand: the Next.js file conventions generate the links.
- The social preview image shows the Valuo wordmark and tagline on the brand's dark background (colors read from `brand/tokens.json` through `src/config/brand-tokens.ts`).
- `BrandLogo` no longer sets `width: auto`: the kit SVGs only carry a viewBox, so the logo collapsed to 0 px.
- Not here: theme colors, screens and the manifest background color (1.10).
- Every other trace of the old brand is gone (every current account is a test account, so nothing is kept for compatibility): repo renamed to `valuo_app`, package name `valuo_app`, CI checks out `LucianoR23/valuo_api`, e2e runs against `../valuo_api` and the `valuo_e2e` database (create it locally), docs use the target domains `app.valuo.ar` / `api.valuo.ar`, comments cleaned. The one-time migration of the old `ahorra.*` / `ahorro.*` localStorage keys is removed.

### 0.14 (app part): lazy charts
- recharts loads with `next/dynamic` (`src/components/report-charts-lazy.tsx`) instead of with `/reportes`: initial JavaScript of that page went from 475 KB to 348 KB gzip. Only the charts are lazy; the report cards fetch their data and show the figures at once, with a placeholder of the chart's size until it loads. No visual change.

### 0.13: FE robustness
- The service worker no longer caches cross-origin requests. Serwist's defaults kept cross-origin GETs for an hour (NetworkFirst), so API responses such as balances and expenses were stored in Cache Storage on the device. A NetworkOnly rule for every other origin now runs first (`src/lib/sw-caching.ts`).
- Offline fallback: a page navigation that fails without network shows `/offline`, precached at build time.
- Logout, "Cerrar sesión en todos los dispositivos" and account deletion now clear everything the device knows about the user (`src/lib/session.ts`): session, current household (also its localStorage key), the whole SWR cache and the service worker's runtime caches. The precache stays, so the app still opens offline. Device preferences (theme, remembered e-mail, dismissed prompts) stay too.
- `app/error.tsx`, `app/global-error.tsx` and `app/not-found.tsx` in Spanish, on a shared `StatusScreen`. `error.tsx` and `global-error.tsx` report the error to GlitchTip (scrubbed like every event): errors caught by a boundary never reach the global handlers. The message is not shown to the user.
- No `loading.tsx`: no page loads data on the server (screens fetch with SWR and show their own skeletons), so a route-level fallback would never show.

### 0.12 (app part): error monitoring (GlitchTip)
- New dependency `@sentry/browser` 11.9.0 (approved by the user; the browser SDK instead of `@sentry/nextjs`, since the app has no server code and the Next.js SDK brings OpenTelemetry and build plugins). With `NEXT_PUBLIC_GLITCHTIP_DSN` set at build time, uncaught errors and unhandled promise rejections are reported. The SDK loads in its own chunk from `src/instrumentation-client.ts`, and only when the DSN is set.
- Events carry no user, breadcrumbs, console output, sessions, headers, cookies or query string; e-mails, IDs, tokens, double-quoted values and numbers are scrubbed from every string (`src/lib/monitoring.ts`). The release is `NEXT_PUBLIC_APP_VERSION`.
- The CSP allows `connect-src` to the DSN's origin.

### 0.16 (app part): security headers
- Every route sends a Content-Security-Policy (`src/lib/security-headers.ts`, wired in `next.config.ts`): scripts from the app and Google Sign-In only, with `'unsafe-inline'` (a nonce would make every page render per request; decided with the user); `connect-src` limited to the app, the API origin from `NEXT_PUBLIC_API_URL` and Google; no framing (`frame-ancestors 'none'`), no plugins, no `<base>`, forms post to the app only. Images and video allow any https host (support attachments).
- Also HSTS (outside dev), `nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`, COOP `same-origin-allow-popups` (Google popup) and a Permissions-Policy that turns off camera, microphone, geolocation, payment and USB.
- Pages stay statically rendered. The values are fixed at build time, like `NEXT_PUBLIC_API_URL`.
- No `X-Powered-By` header. Mozilla Observatory on staging: B+ (the one failing test is the inline-script allowance).

### 0.17: "Actividad reciente"
- `/seguridad` shows the account's latest security events (`GET /me/activity`): sign-ins, failed attempts and new devices highlighted, logout, password and email changes, household membership; each with the device, the IP while it is kept (7 days) and the date in Buenos Aires time (24 h).
- Needs `api_go_ahorro` 0.17.

### 0.5: sessions and email change (app side)
- `/seguridad` has a "Sesiones" card: "Cerrar sesión en todos los dispositivos" ends every session of the account on the server (`POST /auth/logout-all`) and signs out here.
- Changing the email in the profile no longer changes it at once: the toast says a link went to the new address, and the profile shows the pending change until it is confirmed (`pendingEmail`).
- Vitest `testTimeout` is 15 s: component tests that drive dialogs with userEvent passed the 5 s default under the full `pnpm check` load.
- Needs `api_go_ahorro` 0.5 (parts 1 and 3).

### 0.9: insights stream with a ticket
- The live insights stream asks for a single-use ticket (`POST /insights/stream-ticket`) before each connection and opens `/insights/stream?ticket=`; the access token no longer goes in the URL.
- A ticket works once, so the browser's own reconnect (same URL) would fail: on any error the hook closes the stream and reconnects with a new ticket, backing off 1 s, 2 s, 4 s ... up to 30 s, and back to 1 s once connected.
- Needs `api_go_ahorro` 0.9.

### 0.1 (part 4): goals screen matches the API
- A goal in USD or EUR shows its target converted to the base currency, the original amount next to it, and "Calculado con la cotización de hoy (1 USD = $1.500)". Current spending is shown in the base currency (it was labeled with the goal's currency).
- Goal status follows the API (`ok`, `warning`, `exceeded`); the app expected `on_track`/`achieved`, so a goal on track had no badge style and broke its card.
- Goal periods are monthly and weekly, as the API computes them; the form offered "Anual", which the API always rejected, and weekly goals were labeled "Anual".
- New `goals-manager.test.tsx`. Needs `api_go_ahorro` 0.1 part 4 (`targetAmountBase`, `baseCurrency`, `fxRate`).

### 0.1 (part 3): contract alignment with the API
- Insight `severity` is `critical` (what the API emits) instead of `danger`, so critical alerts no longer fail validation or render as plain info.
- Insight type labels match the API: `alert`, `tip`, `credit_period_reminder` and `recurring_spike` have labels; the never-emitted `alert_goal_*` are gone. The "Alertas" filter asks the API for `type=alert` (it filtered client-side for types that do not exist, so it was always empty).
- `GET /insights` is read as a page; the inbox offers a next page from `totalCount` instead of guessing from a full page. Settlements carry `totalCount` too.
- The movements list sends the fixed/variable filter to the API (`kind`), so the count and the pages match the filter; changing it goes back to page 1.
- `transferHouseholdOwnership` is typed as returning nothing (the API answers 204).
- `ui-helpers` confirm test: timeout 15 s (two animated dialogs time out under the full `pnpm check` load).
- Needs `api_go_ahorro` 0.1 part 3 (`GET /insights` page shape).

### 0.15b: brand config, brand-neutral storage keys, dead code (front end)
- `src/config/brand.ts` (`NEXT_PUBLIC_BRAND_NAME`, `_TAGLINE`, `_DESCRIPTION`; defaults are today's "Ahorro — Personal Finance Coach") is the single source for the name users see: page metadata, manifest, social preview image, install prompt, login copy, aria-labels, logo alt text and the service worker's default notification title. Nothing visible changes except two spots that said "Ahorra" (push title default, one aria-label). 1.1 sets Valuo. Build args added to the `Dockerfile` and `DEPLOY.md`.
- Storage keys are brand-neutral (`app.*`, `src/lib/storage-keys.ts`). The five old keys (`ahorro.household`, `ahorra.remembered_email`, `ahorra.emailVerifyBannerDismissedAt`, `ahorra.install.dismissed`, `ahorra.push.dismissed`) are migrated once on load, before any reader, so nobody loses the selected household or the remembered email. The default notification tag is neutral too.
- No deployed domain as fallback: without `NEXT_PUBLIC_API_URL` the app calls `http://localhost:8080`, not the old production API.
- One `refreshOnce` (`src/lib/api/refresh.ts`) for SWR reads, mutations and the scheduled silent refresh (it was copied in three places): a rotating refresh token is never spent twice in parallel.
- Dead code removed: `useGoals`, `useGoal`, `useHousehold`, `useCreditCardPeriodStatus`, `listPushSubscriptions`, `listAdminDeletedHouseholds`, `getAdminHousehold`, `getMyTickets`, `getAuthSnapshot`, `getCurrentHouseholdId`.
- Tests: key migration (including the household store reading the migrated value on first load), brand defaults and env values (manifest included), reads and writes sharing one refresh.

### 0.21i: coverage baseline and floors
- Vitest coverage thresholds (one point under the baseline): `src/lib/**` and `src/stores/**` 94% statements / 82% branches / 97% functions / 98% lines; global 22 / 15 / 23 / 23. `pnpm check` and CI now run `pnpm test:coverage`, which fails below any floor.
- `docs/testing/coverage-baseline.md` with the starting numbers.

### 0.21h: Playwright E2E; fix dev stuck on the loading screen
- Playwright 1.64.1 (approved). `pnpm test:e2e`; `playwright.config.ts` starts the real API (migrating on start) and the app against a disposable Postgres, one worker, Buenos Aires timezone for helpers, browser and API.
- Flows (3 now, decided 2026-11-05): sign up → household → session kept on reload (refresh cookie across ports) → log in again without passing through onboarding; an expense in 3 installments, shared, whose first installment reaches the balances (+$150); a variable monthly bill confirmed from its draft. Setup data goes through the API (`e2e/helpers.ts`), only the flow under test uses the UI.
- CI job `e2e` on PRs: Postgres 18.6 service, the API's `next` branch checked out with a read-only deploy key (`API_DEPLOY_KEY`), production build of the app.
- **Bug fixed (found by the E2E):** in development (React StrictMode) the app stayed on the loading screen after any reload or login. `AuthBootstrap` cancelled its only run on StrictMode's simulated unmount and skipped the second one, so `hydrated` never became true. Production was not affected. Regression test renders it in StrictMode (fails before the fix).
- Seen while writing the flows, unchanged: unverified users are sent to `/verify-email/pending` after login but can use the app from `/`; a draft shows in the recent expenses list (0.4).

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
