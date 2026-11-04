# ahorra_app — Screen Inventory

> Snapshot of `ahorra_app/src/app` as of 2026-11-04. Read-only audit; no code was changed.
> Stack: Next.js 16 App Router · React 19 · Tailwind v4 · shadcn/ui (`base-mira` style on `@base-ui/react`) · SWR · Zustand · Recharts.

## 1. Overview

- **29 screens** (`page.tsx`) plus 4 non-screen routes (`manifest.ts`, `opengraph-image.tsx`, `sw.ts`, icons).
- Every in-app screen is wrapped in `AppShell` (`components/app-shell.tsx`): a desktop sidebar (`md:` and up), a mobile top bar, and a floating mobile tab bar (`Inicio · Movimientos · [+ Agregar] · Objetivos · Más`). "Más" opens a bottom `Sheet` that holds the rest of the nav.
- Most route files are thin: a page header plus one feature component (`*-manager`, `*-list`, `*-form`, `*-detail`). The exceptions are the auth, onboarding, verify, invite, `/ajustes/hogares/nuevo` and `/notificaciones/[id]` screens, which keep their logic in the route file.
- Global overlays mounted once in `components/providers.tsx`: `Toaster` (sonner) and `ConfirmDialogHost` (`lib/confirm.tsx`, an imperative `confirm()` built on `Dialog`).

### Tier legend

| Tier | Meaning |
|---|---|
| **Core** | Main product loop: log an expense, see where money goes, split it with the household, track goals. Also the sign-up funnel. Includes everything in the mobile tab bar. |
| **Secondary** | Valuable but not daily: incomes, recurring items, categories, reports, notifications, settings. |
| **Utility** | System or support flows: password recovery, email verification, invites, security, support, admin. |

---

## 2. Screens grouped by UI pattern

### 2.1 Dashboard card

| Route | Purpose | Main components | Tier |
|---|---|---|---|
| `/` | Home: greeting and date, month stat cards, AI coach bubble (latest insight), month-end forecast, income vs. spent, recent expenses, plus pending drafts/install/push/verification banners | `Dashboard` (`screens/dashboard.tsx`: `Header`, `StatCard`, `CoachBubble`, `ForecastCard`, `IncomeCard`, `RecentList`), `PendingDraftsCard`, `PushProvider`, `InstallPrompt`, `EmailVerificationBanner`, `InsightsUnreadBadge`, `CategoryIcon`, `ThemeToggle` | Core |
| `/reportes` | Monthly breakdown (spent / billed / due, by category, fixed vs. variable), 3/6/12-month trends, and an AI prompt export. Three tabs. | `MonthlyReportCard`, `TrendsReportCard` (Recharts), `AiExportCard`, `InfoHelp`, ad-hoc tab bar in the page file | Secondary |

### 2.2 List

| Route | Purpose | Main components | Tier |
|---|---|---|---|
| `/movimientos` | Expenses for a month, with search and filters (category, payment method, fixed/variable) | `ExpensesList` (month nav, `Select` filters, `Badge`), `InfoHelp` | Core |
| `/ingresos` | Incomes for a month, with a monthly total | `IncomesList` (month nav), `InfoHelp` | Secondary |
| `/notificaciones` | Insights inbox (summaries, goal alerts). Filters, read/unread, grouped by date. | `InsightsInbox` (local `EmptyState`) | Secondary |
| `/soporte` | The user's bug and feature reports, with an "only open" filter and "load more" | `SupportList` (local `EmptyState`), `SupportStatusBadge`, `InfoHelp` | Utility |

### 2.3 List + CRUD manager (list with create/edit in a dialog or inline)

| Route | Purpose | Main components | Edit style | Tier |
|---|---|---|---|---|
| `/objetivos` | Spending limits and savings goals with live progress | `GoalsManager` (`Dialog` form, detail `Dialog`, hand-rolled progress bar) | Dialog | Core |
| `/deudas` | Who owes whom (net balance, matrix), record payments between members, payment history, split rules | `DebtsManager` (`Dialog` for payments and payment detail, `DatePicker`, `Select` filters), `SplitRulesCard` | Dialog | Core (shared-expense value prop) |
| `/recurrentes` | Recurring expenses and incomes. Two tabs. Variable-amount bills, per-series history. | `RecurringManager` (ad-hoc tabs, inline-swap edit cards, `Switch`), `SeriesStatsDialog` | Inline swap | Secondary |
| `/categorias` | Household categories: name, icon (emoji), color | `CategoriesManager` (`Dialog`, `ColorPicker`, raw `@base-ui` Popover) | Dialog | Secondary |

### 2.4 Detail

| Route | Purpose | Main components | Tier |
|---|---|---|---|
| `/movimientos/[id]` | Expense detail: edit, delete, mark instalments paid | `ExpenseDetailView` (view/edit toggle in place, `InfoHelp`, `confirm`) | Core |
| `/ingresos/[id]` | Income detail: edit, delete | `IncomeDetailView` (view/edit toggle, `InfoHelp`, `confirm`) | Secondary |
| `/notificaciones/[id]` | Single insight: body, mark read, delete | Inline in the route file: `Card`, `Badge`, `Skeleton`, local `severityVisual()` | Secondary |
| `/soporte/[id]` | Ticket detail: status, attachments, conversation thread, reply | `SupportDetail` (`Textarea`, `InfoHelp`, no `Card`) | Utility |

### 2.5 Form (full page)

| Route | Purpose | Main components | Tier |
|---|---|---|---|
| `/agregar` | Create an expense: amount and currency with FX preview, category, date, payment method, instalments, household split | `ExpenseForm` (`Select`, `DatePicker`, `Switch`), `InfoHelp` | Core (center tab-bar action) |
| `/ingresos/nuevo` | Create a one-off income | `IncomeForm` (`Select`, `DatePicker`), `InfoHelp` | Secondary |
| `/soporte/nuevo` | New bug or feature report with up to 3 attachments | `SupportForm` (`Textarea`, native hidden `<input type="file">`), `InfoHelp` | Utility |
| `/ajustes/hogares/nuevo` | Create an extra household | Inline: `Card`, `Input`, `Select`, `InfoHelp`. Wrapped in `AuthGate`, **not** `AppShell`. | Secondary |

> No screen uses a **sheet-based form**. `Sheet` only appears in the mobile "Más" menu and inside `InfoHelp`, which switches between dialog and sheet by breakpoint. All create/edit overlays are centered `Dialog`s.

### 2.6 Settings (stacked config cards)

| Route | Purpose | Main components | Tier |
|---|---|---|---|
| `/ajustes` | Profile, household (name, currency, members, invites, danger zone), split rules, banks, payment methods (card closing/due dates) | `ProfileConfig`, `HouseholdConfig`, `SplitRulesCard`, `BanksConfig`, `PaymentMethodsConfig`, `InfoHelp` | Secondary |
| `/seguridad` | Change password, push-subscribed devices, delete account | `ChangePasswordCard`, `DevicesCard`, `DeleteAccountCard` | Utility |
| `/admin` | Superadmin tools (soft-deleted households, etc.) | `AdminPanel` (`Dialog`, `DatePicker`, `Badge`) | Utility (superadmin only) |

### 2.7 Auth (centered card on a brand layout)

| Route | Purpose | Main components | Tier |
|---|---|---|---|
| `/login` | Email/password login, "remember email", Google sign-in | `Card`, `Input`, `PasswordInput`, `GoogleSignInButton`, native checkbox | Core (funnel) |
| `/register` | Sign up (also completes an invite via `?inviteToken`) | `Card`, `Input`, `PasswordInput`, `PasswordStrengthMeter`, `GoogleSignInButton` | Core (funnel) |
| `/forgot-password` | Request a reset link, then a "check your inbox" state | `Card`, `Input` | Utility |
| `/reset-password` | Set a new password from a token, or an invalid-link state | `Card`, `PasswordInput`, `PasswordStrengthMeter` | Utility |
| `/verify-email/pending` | "Check your inbox": re-check status, resend email | `Card`, `Button`, `BrandLogo` (own copy of the auth layout) | Core (funnel) |
| `/verify-email` | Consume the token and show loading / success / error / no-token states | `Card`, `Button`, `BrandLogo` (own copy of the auth layout) | Utility |
| `/invite/accept` | Invite preview, then accept / sign up / switch account, with invalid, expired and accepted states | `Card`, `Button`, `BrandLogo` (own copy of the auth layout) | Secondary |

`(auth)/layout.tsx` provides the logo, the centered `max-w-sm md:max-w-md` column and `DevSignature`, and redirects users who are already logged in. The three verify/invite routes sit outside the `(auth)` group and copy this layout by hand, without `DevSignature`.

### 2.8 Other: onboarding / wizard

| Route | Purpose | Main components | Tier |
|---|---|---|---|
| `/onboarding` | Two-step wizard: create a household, then optionally invite a member (copyable invite link) | Inline: `Card`, `Input`, `Select`, local `StepDot` stepper. Handles its own auth redirect. | Core (funnel) |

### 2.9 Empty states (cross-cutting, no dedicated route)

No route is purely an empty state. Empty states are built inside each feature component, in **three different styles**:

| Style | Where |
|---|---|
| Dedicated local `EmptyState` component (icon + title + text) | `insights-inbox.tsx`, `soporte/support-list.tsx`, `series-stats-dialog.tsx` (three separate implementations) |
| Dashed bordered box (`border-dashed bg-card/50`) | `soporte/support-detail.tsx` |
| Plain muted paragraph inside a Card | `expenses-list` ("Sin movimientos para este filtro."), `incomes-list`, `goals-manager`, `categories-manager`, `debts-manager` ("Todo saldado…"), `recurring-manager` (×2), `banks-config`, `payment-methods-config`, `devices-card`, `admin-panel`, `dashboard` (`RecentList`) |

Result / status states that fill a whole screen (an icon in a colored circle, then a title, text and a link) are repeated about 10 times across `/forgot-password`, `/reset-password`, `/verify-email`, `/invite/accept` and `/verify-email/pending`.

---

## 3. Core vs. secondary

| Tier | Screens |
|---|---|
| **Core (10)** | `/`, `/agregar`, `/movimientos`, `/movimientos/[id]`, `/objetivos`, `/deudas`, `/login`, `/register`, `/verify-email/pending`, `/onboarding` |
| **Secondary (11)** | `/ingresos`, `/ingresos/nuevo`, `/ingresos/[id]`, `/recurrentes`, `/categorias`, `/reportes`, `/notificaciones`, `/notificaciones/[id]`, `/ajustes`, `/ajustes/hogares/nuevo`, `/invite/accept` |
| **Utility (8)** | `/forgot-password`, `/reset-password`, `/verify-email`, `/seguridad`, `/soporte`, `/soporte/nuevo`, `/soporte/[id]`, `/admin` |

*Judgment call:* `/deudas` counts as core even though it is not in the mobile tab bar, because "gastos compartidos" is the app's stated value proposition (`metadata.description`). `/reportes` is secondary but on the edge: desktop puts it in the "Configuración" group, next to settings.

---

## 4. shadcn/ui primitives in `components/ui/`

Consumers are resolved down to screens. Three primitives reach **every authenticated screen** through `AppShell` and `Providers`:

- `Sheet`: the mobile "Más" menu.
- `DropdownMenu`: `HouseholdSwitcher`.
- `Dialog`: `ConfirmDialogHost`.

The table below lists *direct* screen-level usage beyond that baseline.

### 4.1 Stock shadcn primitives

| Primitive | Icons | Used by (components) | Screens |
|---|---|---|---|
| `button` | — | 40+ files | Every screen |
| `card` | — | 35 files | Every screen except `/soporte*`, which hand-rolls card divs |
| `input` | — | 23 files | Auth, `/onboarding`, `/agregar`, `/movimientos` (search), `/movimientos/[id]`, `/ingresos/nuevo`, `/ingresos/[id]`, `/recurrentes`, `/deudas`, `/categorias`, `/objetivos`, `/notificaciones`, `/ajustes`, `/ajustes/hogares/nuevo`, `/seguridad`, `/soporte/nuevo`, `/admin`, `/` (pending drafts) |
| `label` | — | 23 files | Same as `input`, minus `/movimientos` and `/notificaciones` |
| `select` | hugeicons | 12 files | `/onboarding`, `/ajustes/hogares/nuevo`, `/agregar`, `/movimientos`, `/movimientos/[id]`, `/ingresos/nuevo`, `/ingresos/[id]`, `/recurrentes`, `/deudas`, `/objetivos`, `/ajustes` |
| `dialog` | hugeicons | 13 files | `/categorias`, `/objetivos`, `/deudas`, `/recurrentes` (`SeriesStatsDialog`), `/ajustes` (household, banks, payment methods), `/seguridad` (delete account), `/admin`, `/` (install prompt, pending drafts), plus every screen through `confirm()` and `InfoHelp` |
| `sheet` | hugeicons | `app-shell`, `info-help` | All in-app screens (mobile menu), plus every screen that has `InfoHelp` on mobile |
| `dropdown-menu` | hugeicons | `household-switcher` | All in-app screens (shell) |
| `skeleton` | — | 24 files | Every data-loading screen |
| `badge` | — | 10 files | `/movimientos`, `/movimientos/[id]`, `/recurrentes`, `/objetivos`, `/notificaciones/[id]`, `/ajustes`, `/seguridad`, `/admin` |
| `switch` | — | `expense-form`, `recurring-manager` | `/agregar`, `/recurrentes` |
| `textarea` | — | `support-form`, `support-detail` | `/soporte/nuevo`, `/soporte/[id]` |
| `calendar` | hugeicons | `date-picker` only | Indirect, through `DatePicker` |
| `avatar` | — | **unused** | — (`app-shell` hand-rolls initials twice) |
| `progress` | — | **unused** | — (`goals-manager` and `dashboard` hand-roll bars) |
| `separator` | — | **unused** | — (the "o" divider is hand-rolled in login and register) |
| `scroll-area` | — | **unused** | — |

### 4.2 Custom primitives living in `components/ui/` (not from the shadcn registry)

| Primitive | Icons | Screens |
|---|---|---|
| `date-picker` (Calendar + Popover) | hugeicons | `/agregar`, `/movimientos/[id]`, `/ingresos/nuevo`, `/ingresos/[id]`, `/recurrentes`, `/deudas`, `/objetivos`, `/ajustes` (payment methods), `/admin` |
| `info-help` (help dialog on desktop, sheet on mobile) | hugeicons | `/agregar`, `/movimientos`, `/movimientos/[id]`, `/ingresos`, `/ingresos/nuevo`, `/ingresos/[id]`, `/recurrentes`, `/deudas`, `/categorias`, `/objetivos`, `/reportes`, `/ajustes`, `/ajustes/hogares/nuevo`, `/soporte`, `/soporte/nuevo`, `/soporte/[id]` |
| `password-input` | — | `/login`, `/register`, `/reset-password`, `/seguridad` |
| `password-strength-meter` | — | `/register`, `/reset-password`, `/seguridad` (uses raw emerald/amber/red colors) |
| `color-picker` | — | `/categorias` |

### 4.3 Primitives that are missing (and get hand-rolled instead)

| Missing | Ad-hoc replacement |
|---|---|
| `tabs` / segmented control | `app/reportes/page.tsx` and `recurring-manager.tsx`: two separate `bg-muted p-1` button groups |
| `checkbox` | Native `<input type="checkbox">` in `/login` and `payment-methods-config.tsx` |
| `popover` | `categories-manager.tsx` imports `@base-ui/react/popover` directly (the only feature file that bypasses `ui/`) |
| `empty-state` | Three local `EmptyState` functions plus about 12 inline paragraphs (see 2.9) |
| `page-header` | The header block (`h1 text-2xl font-bold tracking-tight` + `InfoHelp` + subtitle) is copy-pasted in 16 route files |
| `month-navigator` | Re-implemented in `expenses-list`, `incomes-list`, `insights-inbox`, `monthly-report-card`, `ai-export-card` (the last one uses text arrows: "‹ Anterior") |

---

## 5. Inconsistencies

Ordered roughly by visual impact.

### 5.1 Two icon libraries
- **lucide-react**: 44 files. All feature code, `lib/nav.ts`, and the shell.
- **@hugeicons**: 7 files, all in `components/ui/` (`calendar`, `date-picker`, `dialog`, `dropdown-menu`, `info-help`, `select`, `sheet`). `components.json` sets `"iconLibrary": "hugeicons"`, so every `shadcn add` brings in hugeicons, while the app code writes lucide.
- Visible result: stroke weight and shape differ within one screen. Examples: the dialog close ✕ (hugeicons `Cancel01Icon`) next to feature ✕ buttons (lucide `X`), and the `DatePicker` calendar glyph next to lucide `Calendar` in `goals-manager`.

### 5.2 Three card languages
- **App cards**: `rounded-2xl border-0 shadow-card`, repeated as a literal string **49×**, plus about 8 variants (reordered classes, `py-0`, `overflow-hidden`, tinted danger/amber versions). No `Card` variant captures it.
- **Auth/standalone cards**: the default `Card` with `p-6` / `p-6 md:p-8` (19×). These keep the border and have no `shadow-card`.
- **Support module**: does not use `Card`. It hand-rolls `rounded-2xl border border-border bg-card p-4 shadow-card` divs, so it keeps the border the app cards drop.

### 5.3 Semantic color tokens defined but bypassed
- `globals.css` defines `--positive`, `--negative`, `--warn`, `--ai`, `--chip`, `--ink-dim`, `--ink-faint`, `--surface-alt`.
- Adoption: `positive` 19 uses, `warn` 9, `ai` 9; `negative`, `chip`, `ink-dim` and `surface-alt` have **0**.
- Instead there are about **60** raw Tailwind palette classes (`emerald-500`, `amber-500/700/300`, `red-600`, …) across 15 files, including auth and verify success states, `goals-manager`, `debts-manager`, `insights-inbox`, `split-rules-card`, `email-verification-banner` and `password-strength-meter`. Negative amounts use `destructive` instead of `negative`.
- **Chart colors are hard-coded hex** with no `--chart-*` tokens, so they don't adapt to dark mode. The same 10-color palette is duplicated in a different order in `categories-manager.tsx` and `monthly-report-card.tsx`. `trends-report-card.tsx` has a third set.

### 5.4 Duplicated components and logic
- **Household creation form**: `/onboarding` step 1 and `/ajustes/hogares/nuevo` are nearly identical (name `Input`, currency `Select`, helper text, error box, submit button). They should be one `HouseholdForm`.
- **Standalone brand layout** (logo + centered `max-w-sm`) is copied in `/verify-email`, `/verify-email/pending` and `/invite/accept` instead of reusing `(auth)/layout.tsx`. Those copies drop `DevSignature` and the `md:max-w-md` breakpoint.
- **Status/result card** (an icon in a `size-12 rounded-full bg-*/10` circle, then a title, text and a link) appears about 10 times across those auth-adjacent screens.
- **Severity → icon/color mapping** for insights exists in `notificaciones/[id]/page.tsx` (`severityVisual`), `dashboard.tsx` (`CoachBubble`) and `insights-inbox.tsx`.
- **Inline error display** comes in two styles: a boxed `rounded-md bg-destructive/10 px-3 py-2 text-xs` and a bare `<p className="text-xs text-destructive">`, sometimes both on the same flow (`/reset-password`).
- **Back link** comes in three sizes (`size-3`, `size-3.5`, `size-4` arrows) with different label styles in `expense-detail`, `income-detail`, `support-detail`, `/soporte/nuevo`, `/notificaciones/[id]` and `/ajustes/hogares/nuevo`.
- **Theme toggle and notifications bell** are rendered in both the shell sidebar and the dashboard `Header` (desktop), so they appear twice on `/`.
- **Date formatting**: about 10 inline `toLocaleDateString` / `toLocaleString` calls that bypass `lib/format.ts`, with mixed locales (`"es-AR"` vs. `undefined`).

### 5.5 Inconsistent interaction patterns
- **Creating an item**: expenses, incomes and tickets use a full page (`/agregar`, `/ingresos/nuevo`, `/soporte/nuevo`). Goals, categories, banks, payment methods and debt payments use a `Dialog`. Recurring items use inline cards in the list. Creating a *recurring* expense and a *one-off* expense therefore look and feel entirely different.
- **Editing an item**: details use an in-place view/edit swap; managers use a `Dialog`.
- **Tabs**: two hand-rolled segmented controls, with slightly different layouts (`flex` vs. `grid grid-cols-2`).

### 5.6 Shell and page-scaffold gaps
- `/ajustes/hogares/nuevo` uses `AuthGate` without `AppShell`, so the user loses navigation mid-app.
- `/onboarding` does its own auth redirect instead of using `AuthGate`.
- `InfoHelp` is on 16 screens but missing on `/notificaciones`, `/notificaciones/[id]`, `/seguridad`, `/admin` and `/`.
- `/notificaciones/[id]` is the only in-app detail route with all its logic in the route file. The others delegate to a `*-detail` component.

### 5.7 One-off styles and typography
- **194 arbitrary font sizes in 40 files**: `text-[11px]` ×86, `text-[10px]` ×51, `text-[12px]` ×37, `text-[9px]` ×12, plus `text-[13px]`, `[14px]`, `[16px]`, `[24px]`, `[28px]`. The type scale is effectively ad hoc below `text-xs`, and 9–10px raises legibility and accessibility concerns.
- The dashboard `h1` uses `md:text-[28px]`; every other page uses `text-2xl`.
- `onboarding`'s `StepDot` builds class names by string concatenation instead of `cn()`.
- Hard-coded `bg-black` in support attachments and `text-white` with gradients in `CoachBubble` bypass theme tokens.

### 5.8 Naming
- The brand appears as **"Ahorro"** (metadata, `aria-label`s) and **"Ahorra"** (`/verify-email/pending` `aria-label`, package `ahorra_app`, folder names).
- The nav label "Superadmin" doesn't match the page `h1` "Admin".

---

## 6. Suggested follow-ups (not done; for prioritization)

1. Pick one icon library. Either set `components.json` → `lucide` and regenerate the 7 `ui/` files, or migrate the 44 feature files to hugeicons.
2. Add a `Card` variant (e.g. `variant="elevated"`) for `rounded-2xl border-0 shadow-card`, and move auth and support onto the decided styles.
3. Map `emerald`/`amber`/`red` → `positive`/`warn`/`negative`, and add `--chart-1..10` tokens.
4. Add the missing primitives to `components/ui/`: `tabs`, `checkbox`, `popover`, `empty-state`, `page-header`, `month-navigator`. Start using the installed `avatar`, `progress` and `separator`.
5. Extract `HouseholdForm`, `StatusCard` and an `(standalone)` route-group layout for the verify and invite pages.
6. Decide one create/edit pattern per entity weight (e.g. full page for complex entities, `Sheet` on mobile / `Dialog` on desktop for simple ones).
7. Define a small-type scale (e.g. `text-2xs` = 11px) and remove `text-[9px]` / `text-[10px]`.
