# Valuo app — design handoff (B.3b → 1.10, 1.2, 1.3, 1.9)

These are the approved designs for the app redesign, made in Claude chat on 2026-11-04. **Don't implement anything from here until item 1.10.** Until then this folder is reference only.

When 1.10 starts:
- Copy this folder to `ahorra_app/docs/design/app/`. The plan expects designs under `docs/design/`.
- Read this README fully.
- Work screen by screen, following plan 1.10's order.

Built on the brand kit in `brand/`, the tokens and logo, and on the screen inventory in `docs/design/screen-inventory.md`.

## Files

| Folder | What | How to use |
|---|---|---|
| `screenshots/<Screen>.light.png` / `.dark.png` | Every screen in both themes (mobile @2x; desktop and components @1x) | Visual reference. The dark one shows the same screen with the dark tokens. |
| `preview/<Screen>.light.html` / `.dark.html` | Static HTML for each screen. Bottom-nav links work between previews. | Open in a browser to read exact sizes, spacing, radii and copy. |
| `source/*.dc.html` | Original canvas sources | Same content, wrapped in the canvas runtime. `{{c.x}}` holes are theme tokens (table below). Ignore `<x-dc>`, `support.js` and `data-props`. |

**Don't paste this markup into components.** It is inline-styled mockup HTML. Rebuild every screen with the project's components and Tailwind classes mapped to `brand/tokens.css`. Every color in the previews is a token.

### Theme holes → tokens

| Hole | Token | | Hole | Token |
|---|---|---|---|---|
| `c.bg` | `bg` | | `c.accent` | `accent` |
| `c.surface` | `surface` | | `c.ai` | `accent-ink` |
| `c.s2` | `surface-2` | | `c.soft` | `accent-soft` |
| `c.border` | `border` | | `c.pos` / `c.neg` | `positive` / `negative` |
| `c.bs` | `border-strong` | | `c.negsoft` | negative tint (add as `negative-soft` if needed) |
| `c.ink` / `c.muted` | `ink` / `ink-muted` | | `c.track` | unfilled bars/pills = `border` |
| `c.onp` | `on-primary` | | `c.card` / `c.shadow` | light: shadow, no border · dark: `border`, no shadow (`shadow-card`) |

## Screens → routes

| Screen (file) | Route / item | Notes |
|---|---|---|
| `Main` — Inicio · Yo | `/` (1.2, 1.10) | Hero amount, Comprometido, cards due, AI weekly card, recent. Replaces the 4 stat cards + coach bubble. |
| `Hogar` — Inicio · Hogar | `/` with the Hogar tab (1.2) | Only for users who belong to a hogar. Shared total, who paid, settle-up card, by category, recent shared. |
| `CargarGasto` | `/agregar` (3.1 + form) | Natural-language input on top, parsed fields below (each tappable to edit), "Compartido" switch. Full screen on mobile. |
| `Movimientos` | `/movimientos` | Month navigator with total, filter chips (not selects), list grouped by day with day totals. |
| `Detalle` | `/movimientos/[id]` | Total, installment schedule (paid / current statement / upcoming), Compartido switch, delete. |
| `Tarjetas` | **new** `/tarjetas` | Card picker, statement to pay + "Marcar como pagado", next statement so far, Comprometido for that card, installments in progress. Card setup (closing/due) moves here from Ajustes. |
| `Mas` | "Más" tab: a full page on mobile (replaces the 13-tile sheet) | Grouped list: Tu plata / Hogar / Cuenta. Profile row on top. "Desarrollado por luciano.rodriguez" links to `https://portfolio.lemydev.com`. |
| `Plan` | `/plan` (2.1/2.2, Phase 3) | Trial status, monthly/annual, 3 plans with `[PRECIO]` placeholders read from config, the ARS/Mercado Pago/USD-index notice, consumer buttons. |
| `Onboarding` | `/onboarding` step 2 of 4 (1.3) | "¿Cómo pagás?" multi-select. The steps follow plan 1.3: name → cómo pagás → closing/due per card → first expense. |
| `ModoDiscreto` | 1.9 | Amounts become `$ ••••••` everywhere. Charts stay, since they're proportions. Eye button pressed state plus a toast. Each masked amount has `aria-label="Monto oculto"`. |
| `DesktopInicio` | `/` at ≥ md | Sidebar replaces the tab bar. Content max 1120 px, grid `auto-fit minmax(420px,1fr)`, recent movements as a table. Other screens follow the same shell. |
| `Componentes` | `components/ui/*` | One version of each primitive. Build these first (1.10 step 2). |

**Screens with no design: build them from the patterns above and the components sheet.** login/register/forgot/reset, verify/invite, ingresos (+ new, + detail), recurrentes, categorías, presupuestos y objetivos, reportes, notificaciones (+ detail), ajustes, seguridad, soporte (+ new, + detail), admin, Movimientos at desktop width.
- Lists → `Movimientos`.
- Details → `Detalle`.
- Simple create/edit → bottom sheet (mobile) / dialog (desktop).
- Settings → grouped list like `Mas`.
- Auth and result screens → the result card.

## Decisions (apply everywhere)

1. **Bottom nav:** Inicio · Movimientos · [+ Cargar gasto] · Tarjetas · Más.
   - The center button is an `accent` circle with an `ink` plus.
   - "Objetivos" moves into Más as "Presupuestos y objetivos".
2. **Yo · Hogar:** a segmented control replaces the household dropdown switcher. It only shows when the user belongs to a hogar. Users without one never see any household UI (plan §1, space model).
3. **Hogar invite:** offered after the first expense, as a card on Inicio (pattern: the `accent-soft` card), never inside onboarding.
4. **Create/edit pattern:**
   - Complex entities (expense) → full screen.
   - Simple ones (goal, category, card, bank, member payment, recurring) → bottom sheet on mobile, centered dialog on desktop.
   - Destructive confirmations → the confirm dialog.
   - This ends today's three different patterns.
5. **Icons:**
   - Lucide only, 1.75 stroke, 20 px in UI and 24 px in nav. Remove hugeicons: set `components.json` → lucide and regenerate the `ui/` files.
   - Categories use Lucide icons. **No emojis in the UI.** Migrate existing emoji categories to an icon mapping.
   - Category colors aren't used in lists. Charts use `accent` for the highlighted series and `ink-muted` for the rest.
6. **Money:**
   - `$ 128.450,50` with tabular figures; no decimals when they are ,00 in lists.
   - `US$` for dollars.
   - Incomes get "+" and `positive`. Expenses have no sign.
   - Installments read "3 de 12" with the pill bar.
   - Dates: "Hoy", "Ayer", "Lun 2", "3/12".
7. **Theme:** follows the OS (absorbs the old 1.5), with an override in Ajustes. In dark, cards use `border` and no shadow.
8. **Copy:** voseo; one primary action per screen; no exclamation chains; product names exactly as in the screens ("Mi plata", "Hogar", "Comprometido", "Cuentas entre ustedes").
9. **Unreleased features** are labeled "Pronto" wherever plans list them (WhatsApp, PDF statements, inflation/projection).
10. **Accessibility:**
    - 44 px targets.
    - Real buttons, links and labels.
    - Focus ring = `focus` token, 2 px with 2 px offset.
    - Small type is never below 12 px: kill `text-[9px]`/`text-[10px]` per the inventory, and add a `text-2xs` = 12 px step if needed.

The sample data in the mockups is internally consistent (e.g. Ana owes $ 14.880 = half the difference of what each paid). It's illustrative only: never ship it.
