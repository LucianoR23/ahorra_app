# Changelog — v2 (`next` branch)

Entries reference item IDs from `AHORRA_V2_PLAN.md` (workspace repo).

## Unreleased

### 3.3 (app part): receipt and screenshot reading
- A camera button next to the mic in «Contalo como te salga» (decided with the user). It opens the phone's picker (take a photo or pick one from the gallery) for a paper ticket or a Mercado Pago or bank transfer or payment screenshot.
- The image is resized in the browser to at most 1600 px on its longest side and sent as JPEG (`src/lib/resize-image.ts`; EXIF rotation applied, quality lowered until it fits the API's 5 MB, files over 40 MB or that the browser cannot decode are refused) to `POST /expenses/parse-receipt`. iPhone HEIC photos work where the browser decodes them.
- What was read goes into the box as a sentence ("Carrefour 15430,50 mercado pago ayer") and the rows fill as for a typed one; a correction typed there is read again as text without sending the photo again. The description is the store or the recipient.
- Messages for a photo that is not a payment, cannot be read, or cannot be opened. Voice and photo share one reader, so a later one wins over an earlier one still on its way.
- ESLint ignores local Playwright output (`playwright-report/`, `test-results/`), which made `pnpm lint` fail after a local E2E run.
- Visual test: the month summary under a month navigator stays on one line in screenshots (`e2e/screenshot.css`). "vence el miércoles 22 nov" wrapped on phones on some days only, so the statement screen changed height with the date and failed against its baseline.
- The Cargar gasto help text mentions the camera. Visual baselines of Cargar gasto updated.

### 0.15d: Node 26 LTS, pnpm 12, minor/patch refresh
- Node 26.13.1 (LTS since 2026-10-28; Node 24 is in maintenance): `.nvmrc` 26, `engines.node` `>=26`, Docker `node:26.13.1-alpine3.24`.
- pnpm 12.18.0 in `packageManager`. Every `pnpm-workspace.yaml` setting is still recognized; the lockfile stays at version 9.0 and now records the pinned pnpm in a first YAML document.
- Node 26 ships no corepack: the Dockerfile installs with npm the pnpm that `package.json` pins (npm 11 skips its install script, so pnpm runs through Node). README prerequisites updated.
- Minor and patch updates: next 16.4.6, react and react-dom 19.3.1, @sentry/browser 11.12.0, lucide-react 1.72.0, @playwright/test 1.65.0, msw 3.0.5, @testing-library/user-event 14.6.9, @vitejs/plugin-react 6.3.0, eslint-config-next 16.4.6, `@types/node` 26 to match the runtime. Replaces Dependabot #32, #33 and #35.
- CI Postgres `18.7-alpine3.24`.
- The majors stay as their own items: TypeScript 7, ESLint 10 (ESLint 9 is now unsupported upstream), react-day-picker 10, jsdom 31.

### 3.2 (app part): voice entry
- The mic of the design inside "Contalo como te salga". Tap to start, tap to stop (decided with the user); it stops by itself at 30 s and shows the time left. The note goes to `POST /expenses/parse-audio` as recorded (WebM in Chrome and Edge, MP4 in Safari, Ogg in Firefox, about 32 kbps) and is not kept anywhere.
- What was heard is written into the box and the rows fill as for a typed sentence. A wrong word is fixed in the box and Enter reads it again as text, without sending the audio again (decided with the user).
- Messages for a note that was not heard, a microphone that is not allowed or fails, and "Escuchando…" while it is read. Browsers that cannot record show no mic. Leaving the screen mid-recording drops it and frees the microphone.
- `Permissions-Policy` now allows the microphone for the app's own pages (`microphone=(self)`); it was blocked for everyone. Camera, location, payment and USB stay blocked.
- The API client sends a `Blob` body raw with its own type.

### 3.1 (app part): natural-language entry
- Cargar gasto gets the "Contalo como te salga" box of the design on top. A sentence such as "zapatillas 120 mil en 6 cuotas con master" is read on Enter or when the box loses focus (once per sentence; Shift+Enter is a new line) through `POST /expenses/parse`, and fills the rows it mentions: amount, currency, date, installments, description, payment method, category and Compartido. Rows the sentence does not mention keep what the person typed (decided with the user). Nothing is saved until "Guardar gasto".
- "Lo entendimos así. Tocá un dato para cambiarlo." when it read the amount; otherwise it says the amount is missing, that only expenses can be loaded (with an example), or that it could not read it, and the rows stay editable as always.
- A word that fits several payment methods ("visa" with Visa Galicia and Visa Santander) leaves Pago empty with "Tenés 2 Visa: elegí cuál", and those methods come first in the list (decided with the user: never guess the card).
- "compartido" or "hogar" in the sentence turns Compartido on when there is a hogar, and the category is asked again in the hogar.
- The help of Cargar gasto explains the box. The microphone of the design arrives with voice entry (3.2).

### 8.4 (app part): auto-categorization
- Cargar gasto fills the category by itself when the description loses focus, with `POST /categories/suggest` in the space the expense goes to. A quiet note under the row says where it came from: "Como la última vez" (history) or "Sugerida automáticamente" (AI). Asked once per description and space.
- The person always wins: once they pick a category, even "Sin categoría", nothing is suggested again. A category that came filled in (Cargar compra from the simulator) is never replaced. Changing Compartido asks again in the new space.
- `FormRow` gains a `hint`. The shared `Select` passes a second argument, `byUser`, false when Base UI clears a value by itself (a value missing from new items), so the form tells a person's choice from an automatic reset.

### 8.2 (app part): AI summaries
- Inicio heads the monthly summary as "Tu mes", like "Tu semana" for the weekly one, and shows its paragraph.
- Notifications: "Mensuales" filter, "Resumen mensual" label, and both summaries link to the numbers behind them (Movimientos for the week, Reportes for the month).
- Preferencias de notificaciones shows the new switches the API adds (push for the weekly summary, app for the monthly one) with no code change.

### 8.1 (app part): AI spend in the superadmin panel
- New "IA" section in `/admin` (`/admin/ia`): today's spend against the daily budget with a progress bar, this month's spend and requests, today's errors, requests stopped by the limits and average latency.
- By task this month (cost, requests, errors, stopped) and the people who spend the most, each linking to their account.
- Says when AI is off (`AI_ENABLED`) and when today's budget ran out (AI paused until midnight). Metrics only: the panel never sees what people sent to the AI.

### 10.2 (app part): daily logging reminder
- "Recordatorio diario" in Preferencias de notificaciones: a switch (off by default) and the time, in half hours (21:00 by default). It sends a push asking "¿Hoy no gastaste nada?" only on days nothing was loaded.
- If the chosen time falls inside the quiet hours, a notice says it won't arrive, since quiet hours drop the reminder instead of holding it.
- The help panel explains both. Saving sends `dailyReminder`; with an API that doesn't return it yet, the switch shows off.

### 1.11 (app part): superadmin area
- `/admin` is now its own area with its own layout: a sidebar on desktop and a row of tabs on phones, "Superadmin" in the header and "Volver a la app". None of the app's navigation, so the superadmin uses the app like anyone else. Still reached from Más. For anyone who isn't a superadmin it is the regular 404 page.
- Resumen: accounts (new in 7 days and this month, active in 30 days, verified), hogares (and deleted ones), confirmed waitlist, and movements loaded per month. Counts only, no amounts (plan §8b).
- Cuentas: search by email or name, newest first, with badges for superadmin, unverified and deleted accounts. Each account shows its metadata (sign-up, verified, sign-in methods, last seen, open sessions), its spaces by name, role and size, and its activity.
- Auditoría: the security events of every account and every superadmin action, filtered by Sesiones, Fallidos, Cuenta, Hogares or Superadmin, 50 at a time. Each event names the account and, when someone else did it, who.
- Hogares borrados and Herramientas (regenerate insights, test push) moved from the old single page into their own sections, unchanged.
- Lista de espera: download the confirmed entries as CSV and erase an address on request (Ley 25.326, 5 business days), with a confirmation. Both use the B.5 endpoints, which until now had no screen; the API records them in the audit log, without the erased address.

### 10.1 (app part): notification preferences
- New screen "Preferencias de notificaciones" (`/ajustes/notificaciones`), reachable from Ajustes (Avisos > Notificaciones) and from a gear in Notificaciones. Per person, for every space.
- "Qué te avisamos": each kind with a switch only for the channels it really uses (App, Push, Email). Changes save right away and go back if saving fails.
- "Horario de silencio": on by default from 23:00 to 08:00; times in half hours. Pushes that fall inside wait until it ends; in the app they show up as usual.
- Built from the existing settings list, switch and select components (no design export for this screen).

### 9.1 (app part): move expenses and incomes between Mi plata and the hogar
- Detalle of an expense: the "Compartido" switch of the `Detalle` design. On, the expense is in the hogar and splits by its rules; off, it is in Mi plata. Toggling asks first (going back to Mi plata warns that the split, and so "Cuentas entre ustedes", changes), calls `POST /expenses/{id}/move` and opens the space the expense went to, so the same screen shows it there.
- Detalle of an income: "Pasar al Hogar" / "Pasar a Mi plata" with the same confirmation and `POST /incomes/{id}/move`.
- Only the author of the expense (or whoever received the income) sees them, once the user has a hogar; a draft expense is confirmed first. Help texts explain the split and the category matched by name.
- Plan 9.1 rescoped with the user: no private items inside the hogar; Mi plata is the private space.

### 11.1 (app part): download in Excel
- Movimientos and Ingresos have a download button next to the help: "Descargar en Excel" offers the month on screen (Movimientos keeps its filters: type, category, payment method, search, and says "con los filtros") or the whole year of that month ("Todo 2026", without filters).
- The file comes from the API (`/exports/expenses.xlsx`, `/exports/incomes.xlsx`) and is saved as `gastos-2026-11.xlsx`, `gastos-2026.xlsx`, `ingresos-...`. A toast confirms it, or shows the error.
- `apiFetchBlob` (client) and `apiDownload` (mutations) fetch files with the session and the 401 refresh-and-retry that mutations already had (now shared in `withRefresh`). `saveFile` hands the blob to the browser.
- Help texts of both screens explain the download; Movimientos says drafts are left out and other members' payment methods stay blank.

### 7.3 (app part): subscription suggestions and price-increase alert
- Recurrentes, Gastos fijos tab: "¿Son gastos fijos?" lists expenses loaded by hand that repeat every month (from `GET /recurring-expenses/suggestions`), with how many of the last 4 months, the day and the last amount (and the earlier one when it went up).
- "Agregar como fijo" opens the new fixed expense filled in: description, amount, currency, category, payment method (left empty when it is another member's) and a start on its day, the month after the last one paid and never before today, so nothing loaded by hand is booked twice. Once created it stops being suggested.
- "No es fijo" hides it for the whole space (`POST /recurring-expenses/suggestions/dismiss`).
- A variable fixed expense has "Avisame si sube" (sin aviso, 10%, 20%, 30%, 50%; a value set before is kept): the existing `alertThresholdPct`, a push when a confirmed bill is that much over the previous one. Turning "Importe variable" off clears it.

### 7.2 (app part): Vencimientos
- New screen "Vencimientos" (`/vencimientos`), in Más > Tu plata and linked from Tarjetas: the month with a dot on each day with something (paid, comes in, a card closes) and the list below, by day. Tap a day to see only that day; arrows change the month.
- Rows: fixed incomes, card due dates (statement totals per currency, installments, paid or overdue), fixed expenses (category, payment method, "monto estimado" when variable) and card closings. A statement row opens it; a fixed expense or income opens Recurrentes.
- Card installments are inside each statement's total, not listed one by one. Amounts stay in their currency, like Tarjetas.

### 5.6 (app part): "Ver en" other currencies and crypto
- The "$ / US$" switch on Inicio and Reportes becomes a "Ver en" picker: pesos, dólares, euros, reales, pesos chilenos, pesos uruguayos, USDT, bitcoin and ether. View only: movements are untouched.
- The dollar keeps both modes (each movement's day or today). Every other currency is at today's rate; the note under the totals says which rate and price. Bitcoin and ether add "Precios cripto de CoinGecko" (CoinGecko's terms).
- Only currencies the API has a quote for are listed, so bitcoin and ether show up once the API has its CoinGecko key. A currency picked before its quote vanished stays listed, and the note offers pesos back.
- Amounts: R$, $U, CLP, USDT; bitcoin and ether with up to 8 decimals ("BTC 0,000396").
- The per-device choice is migrated: the old dollars switch on becomes "Dólares".

### 5.5 (app part): the base currency is always pesos
- "Crear hogar" no longer asks for a currency, and Hogar drops the "Moneda base" row: a space always sums in pesos. Expenses and incomes are still loaded in ARS, USD or EUR.
- The hogar dialog only edits the name. Help texts say "pesos" instead of "tu moneda base".
- `createHousehold` and `patchHousehold` stop sending `baseCurrency` (needs api #71).

### 5.4 (app part): spending in today's pesos
- Reportes · Tendencias: "Sin ajustar / Pesos de hoy" under the period, in pesos only (hidden with "US$" on or in a space kept in another currency). In today's pesos the chart and figures come adjusted by INDEC's CPI (`adjust=cpi`), with a line saying up to which month the index goes and that later months go unadjusted until their figure is out. Without an index yet, an alert offers the unadjusted view.
- Reportes · Mensual: a past month shows "En pesos de hoy" under Gastado when the API sends it.
- The Tendencias note names the months not adjusted yet and why ("Octubre y noviembre van sin ajustar: el INDEC todavía no publicó su inflación."). A gap of more than two months says "hasta que tengamos el dato del INDEC" instead, since that means our copy is behind, not INDEC.

### 5.3: Ver en dólares
- A "$ / US$" selector on top of Inicio (Yo and Hogar) and Reportes, remembered per device (`app.view_currency`). In dollars, the month's totals, categories, what each member paid and Tendencias come from the API in dollars.
- Under the totals: which dollar converts them ("al dólar MEP del día de cada movimiento") and a link to use today's instead. Without quotes for the space's dollar, an error with "Ver en pesos".
- Tarjetas and Cuentas entre ustedes stay in pesos; with "US$" on they say so. Dollars there are an optional later item (plan 5.3b), so the app does not promise it.
- Inicio · Yo takes the month's income from the monthly report instead of `/totals/income`.

### 5.2b: Cotizaciones
- New screen `/cotizaciones`, in Más under "Tu plata" and from "Ver evolución del dólar" in the space's rate setting. A line chart of a dollar's selling price, one point per day (`GET /exchange-rates/history`), picking the dollar (starts at the space's) and the period (30 days, 6 months, 1 year), with today's price and the change over the period ("+5,9% en 30 días").
- `TrendsLineChart` takes `yTick`, `fitY` (an axis fitted to the values) and `dots`. Discreet mode hides the price, the axis numbers and the tooltips.
- Not in the visual regression: it shows live rates.

### 5.2: stale rates
- When the dollar a conversion uses was not confirmed by any source in the last day, Cargar gasto, Cargar ingreso and the space's "Cotización" setting say "Ojo: esta cotización no se actualizó en el último día." A euro priced through the dollar warns when any of the rates it uses is stale. Reads `stale` from `GET /exchange-rates/current`.
- The history endpoint (`GET /exchange-rates/history`) has no screen yet.

### 5.1: which dollar converts
- Each space has its dollar: "Cotización de Mi plata" in Ajustes and "Cotización del hogar" in Hogar (the owner changes it, the others see it). MEP by default. Options: MEP, Oficial, Blue, Tarjeta, CCL, Cripto, Mayorista, each with its price.
- Cargar gasto and Cargar ingreso show "Cotización" when the amount is in another currency, starting at the space's dollar: e.g. Tarjeta for a purchase abroad, CCL for dollars sold. The preview says "≈ $ 204.100 al dólar Tarjeta"; the pick goes as `rateSource`.
- The expense and income detail say which dollar converted them ("al dólar MEP").
- `lib/fx.ts` prices like the API (selling price, a euro without that source through the dollar); the price in the selector respects discreet mode.

### 4.8: "¿Me lo puedo comprar?"
- New screen `/simular`, in Más under "Tu plata". Amount and currency, payment method, installments and an optional category; "Ver cómo me queda" asks the API (`POST /simulations/purchase`), which saves nothing.
- The answer: how many installments and from which statement, the tightest month ("te quedan" or "te faltarían"), month by month what the cards would have, the share of income and what is left after the recurring expenses, the chosen card's statements before and after, and the limits the purchase counts against. Without a recurring income it asks for the salary instead of showing what is left. Every amount goes through `<Money>`, so discreet mode hides them.
- "¿Cuotas o contado?": the installments' value today against the cash price at an editable monthly yield (default 2%), computed in the app (`lib/simulator.ts`).
- "Cargar compra" opens Cargar gasto filled in (`/agregar?amount=…&currency=…&paymentMethodId=…&installments=…&categoryId=…`); `ExpenseForm` takes `initial`.
- Open to every plan for now: the Plus/Pro Hogar gate comes with pricing.

### 1.10b Motion
- Lists rise into place when they appear: the day groups of Movimientos and Ingresos one after the other (30 ms apart, at most 8 steps), and each group of the grouped lists. `rise` in `globals.css`, with the brand's `duration-base` and `ease-out`; nothing moves with reduced motion.
- Press feedback: rows that are links or buttons (`ListRow`, `MenuItem`) dim while held, and the button's 1 px press now eases instead of jumping.
### 1.10b Visual regression
- The screenshot harness compares every shot with its baseline when `VISUAL=1` (CI): `toHaveScreenshot`, soft so all changed screens show up, up to 1% of pixels different. Baselines live in `e2e/__screenshots__` and come only from CI's Linux runner.
- Dates, months, weekdays, times, "día 9", "en 5 días" and emails are masked, and so are the chart's axis labels and the Google button (drawn by Google's servers).
- CI runs by hand (`workflow_dispatch`) rewrite every baseline and upload them as the `visual-baselines` artifact, to download and commit. On PRs a changed screen uploads its expected, actual and diff images (`visual-diffs`).
- First baselines committed (126 shots from the manual run on `next`); PRs now fail on a changed or missing screen.
- The screenshot data no longer depends on the day: the card purchase that fills the closed statement is from the 15th of last month (it was "yesterday", which on the 1st fell out of this month's lists), and the card's default closing is the 2nd. Baselines of Inicio, Movimientos, Reportes and Ajustes rewritten.
- The Google button keeps its height while Google draws it, so the form below no longer jumps.

### 1.10b Acceso y Superadmin
- Login, Crear cuenta, Recuperar contraseña and Nueva contraseña share one frame (`components/auth/auth-shell`): the wordmark, a narrow column flat on the phone like Onboarding and a card from `sm` up, the screen title in `text-title`, labels over the fields, errors under them in `negative` and server errors in the inline alert. The panel fades in, except with reduced motion.
- Outcome screens use the result card with an `h1` (`ResultCard` takes `headingLevel`): "Te enviamos un mail", "Este link no sirve" (reset and verify without token), "Verificá tu email", "Email verificado", the invite and its dead ends ("Esta invitación ya se usó", "venció", "la canceló"). Their actions are pill buttons; the old links inside buttons are gone.
- `/login` no longer logs a hydration mismatch: the remembered email is read after hydration and the form mounts again with it. Same fix for the email on "Verificá tu email" (sessionStorage).
- Login honors `?next=`: "Ya tengo cuenta" on an invite now comes back to the invite after signing in, instead of dropping it on Inicio. `lib/safe-next` only accepts paths of the app, so the param is not an open redirect.
- Superadmin follows the grouped list of Más with a back button: your account, "Regenerar insights" (a sheet with the date), "Enviar push de prueba", and "Hogares borrados" as rows that open a sheet with the owner, "Restaurar" (confirmed) and "Eliminar para siempre" (typed name). A regular account gets an empty state. An empty list sent as `null` no longer breaks it.
- `ui/date-picker` takes an `id` for its label.
- Tests for the hydration (fails on the old page), `next`, the result screens, the invite links and the superadmin sheet. The screenshot harness also shoots Crear cuenta, Recuperar contraseña and the reset link without token.

### 1.10b Cuentas entre ustedes
- Deudas is now "Cuentas entre ustedes", like in Más, with a back button. Your balance on top ("Te deben", "Debés" or "Tu saldo", big, in `positive` or `negative`); "Lo que se deben" in plain words ("Luis te debe", "Le debés a Ana") with "Pagar" on the ones that involve you; "Pagos" filtered with chips ("Todos", "Con Luis") and a date menu, each payment a row ("Luis te pagó", date and note) that opens its sheet, where it is deleted; "Cargar más"; then "Cómo se dividen los gastos".
- Registrar pago: one line saying who pays whom and the debt, the amount (no more than the debt), date and note, one "Confirmar pago" button. The settlement id and the "emerald" and "font-mono" leftovers are gone.
- Empty lists sent as `null` by the API no longer break the screen. First tests for it.
- The screenshot harness shoots it inside the hogar.

### 1.10b Hogar y miembros
- Hogar follows the grouped list of Más, titled "Hogar y miembros" like in Más, with a back button. "Hogar": name and base currency as rows (the owner opens a sheet to change them, with the currency as a segmented control; members see them read-only). "Miembros · 2": avatar, name, email and "Dueño"; the owner gets a menu per member ("Hacer dueño", "Sacar del hogar", both confirmed) and "Invitar a alguien", which opens the invite sheet and then shows the link to copy. "Invitaciones pendientes" with a menu to resend or cancel. "Cómo se dividen los gastos": each member's share, and "Cambiar la división" opens a sheet that only saves when it adds up to 100%. Last, "Eliminar hogar" (typed confirmation) or "Salir del hogar" (confirmed) as a destructive row.
- Without a hogar, and in Cuentas from Mi plata, an empty state offers to create it or go to it.
- Crear hogar uses the app shell, the page header with back and the currency as a segmented control.
- Copy without internal terms ("soft-deleted", "owner", "DB").
- Tests for removing a member, inviting, the split sheet and the member's read-only view.
- `ui/button`: a button rendered as a link (`render={<Link href />}`) keeps the link role, so screen readers say "link" (it was "button" in 16 places, like "Crear hogar" and "Ir al inicio").

### 1.10b Soporte
- Soporte follows the Movimientos list: page header with the + for a new report, a "Solo abiertos" chip, the reports as rows (bug or idea icon, subject, date, attachments and replies, status badge on the right), "Cargar más" and an empty state. An empty page from the API (`items: null`) no longer breaks it.
- Nuevo reporte: page header with back, Error · Mejora as a segmented control, attachments as removable rows, "Enviar reporte" pinned at the bottom on phones.
- The report follows the Detalle pattern: back button, the icon, kind, subject and status centered, the description in a card with when you sent it, the attachments, the conversation (your messages in ink, the team's in surface) and the reply box with a label.
- Status badges use theme tokens. First tests for the three screens.
- Más and settings rows: with a detail, the label keeps its width and the detail takes up to two lines on the right ("Cuentas entre ustedes" no longer wraps into three lines; "Ana te debe $ 1.707,50" and a long email stay whole).

### 1.10b Ajustes y Seguridad
- Ajustes and Seguridad follow the grouped list of Más. Ajustes: "Perfil" (name and email as rows that open the profile sheet, a pending email change as the group's note) and "Apariencia". Seguridad, now titled "Seguridad y privacidad" like in Más: "Acceso" (Cambiar contraseña opens its sheet, Cerrar sesión en todos los dispositivos), "Privacidad en este dispositivo" (the two switches), "Dispositivos con notificaciones", "Actividad reciente" and "Cuenta" (Eliminar mi cuenta, a destructive row that opens the confirmation). A back button to Más on both.
- `ui/menu-list` gains `MenuRow` (a row with its own content) and a `footer` note per group; a long detail now truncates instead of covering the label.
- Tests for the profile sheet (including a taken email), the password sheet and deleting the account.

### 1.10b Reportes
- Reportes uses the page header and the Mensual · Tendencias · Exportar IA tabs from the components sheet.
- Mensual: the month navigator ("Gastaste $ X", no future months), Gastado, Facturado and A pagar as rows that say which date each one counts by, "Por categoría" as bars (the biggest in `accent`, the rest in `ink-muted`, with each one's share) and "Fijo y variable" as one split bar. These replace the recharts bar and donut, so recharts only loads for Tendencias. A month with nothing by category no longer breaks (the API sends `null`).
- Tendencias: 3 · 6 · 12 meses as a segmented control; the line chart in theme colors (Gastado `accent`, Ingresos `positive`, A pagar dashed, Neto `ink`), readable axis labels, a themed tooltip, and the last month's figures as rows.
- Exportar IA: the month navigator, the month's figures as rows, and the prompt with "Copiar" (it says so if the browser blocks the clipboard). First test for it.
- `components/category-bars` is shared with Inicio · Hogar ("En qué se fue"). Bars grow in when they appear (`grow-x`, off with reduced motion).
- The screenshot harness shoots Tendencias.

### 1.10b Notificaciones
- Notificaciones follows the Movimientos pattern: "N sin leer" / "Todo al día" under the title, search behind the magnifier, "Marcar todas como leídas" as an icon button, filter chips (Sin leer, Todas, Alertas, Diarias, Semanales, Gastos compartidos, Invitaciones, Pagos) and the notifications grouped by day, each row with its severity icon, title, text, time and an unread dot. "Cargar más" replaces Anterior/Siguiente. The per-row read and delete buttons left: opening a notification marks it read, and it is deleted from its detail.
- The detail follows the Detalle pattern: back button, the icon, kind, title and date centered, the text in a card, one button to act on it ("Ver resumen", "Ver tarjetas", "Ver objetivos", "Ver recurrentes", "Ver gasto", "Ver cuentas") and "Eliminar notificación" at the end, now behind a confirmation. Severity colors use theme tokens.
- `lib/insights` holds the labels and links the two share (a goal alert now leads to Objetivos, a shared expense to the expense).
- The screenshot harness shoots the hogar's notifications and one notification.

### 1.10b Recurrentes, Categorías, Presupuestos y objetivos
- Create and edit dialogs open as a bottom sheet on phones (with a grabber, sliding up unless reduced motion is on) and stay a centered dialog from `sm` up, as the design's components sheet asks. Confirmations stay centered everywhere (`DialogContent layout="center"`). This applies to every create/edit dialog in the app.
- `ListRow` takes `onClick` (the row is one button that opens a sheet); its inner markup is spans so it is valid inside a button.
- Recurrentes: header from the components sheet, "Gastos fijos · Ingresos fijos" tabs, one list per tab (category icon, "Día 10 · Visa · Variable · Pausado", the amount, "último"/"estimado" for variable bills), the + button for a new one, and an empty state. Tapping a series opens its sheet: the form, "Ver histórico" (expenses), "Pausar"/"Activar" and delete. The form rules stay: a monthly series is charged on its start date's day, a variable bill is one installment, the start date can't change. A fixed income's account no longer lists credit cards. First tests for this screen.
- Categorías: one list with subcategories indented and "2 subcategorías" under their parent; tapping a row opens its sheet, where it is also deleted. Empty state.
- Presupuestos y objetivos (renamed from Objetivos): a card per goal with its status (theme colors, no more emerald and amber literals), "$ X de $ Y", the progress bar and the period; tapping it opens its sheet to edit, check how it was going on a date, pause or delete. Currency and period use the segmented control; "who is it for" only shows in a hogar. Empty state.
- Help texts updated (no more "ícono (texto o emoji)" or "anual" goals).
- The screenshot harness seeds a fixed expense, a fixed income and a goal.

### 1.10b Ingresos
- Ingresos follows the Movimientos pattern (no design of its own): "Entraron + $ 1.151.143 · 1 ingreso" in the month navigator (the month's real total; before, it added up only the page shown), incomes grouped by day with the day's total, "Cargar más", and the + button for a new one. An empty month invites to add one.
- The income detail follows the Detalle pattern: centered amount, data rows (Fuente, Fecha, Lo recibió, Cuenta, Espacio), editing in a dialog (with "Otro" for a source of its own), "Eliminar ingreso" at the end.
- Nuevo ingreso follows the Cargar gasto layout, full screen on phones. "Lo recibió" shows only with others in the space; "Cuenta" no longer lists credit cards.
- Shared pieces: `ui/form-row` (rows of Cargar gasto and Nuevo ingreso), `lib/group-by-day`, `components/close-button`.
- Fix: the month navigator's summary was a `<p>` that got a `<div>` skeleton while loading (invalid HTML, a hydration warning in Movimientos). The "$" before a big amount no longer wraps.
- The screenshot harness logs browser errors and shoots an income, its detail and Nuevo ingreso.

### 1.10b Más
- The hogar rows in Más say how many are in the hogar ("2 personas", "Solo vos") and who owes whom ("Ana te debe $ 14.880", "Le debés $ 500", "Al día"), read from the hogar even while Mi plata is open (`useBalancesMe` takes a household). "Tu plan" of the design waits for Phase 3.
- Cargar gasto: the row labels use the body size, like "Fecha".

### 1.10b Cargar gasto
- Cargar gasto follows the `CargarGasto` layout: full screen on phones (no top bar or bottom nav, "Cargar gasto" with a close button), the amount big on top with ARS · USD · EUR next to it (and "≈ $" in pesos for another currency), the data as rows (Descripción, Categoría, Pago, Cuotas, Fecha), "Compartido" in its own card, and "Guardar gasto" pinned at the bottom. Desktop keeps the sidebar.
- Cuotas shows "6 de $ 20.000", the segment bar and where the first one lands: "La primera entra en el resumen que cierra el 28/11 y vence el 8/12." (or "en el resumen de noviembre." when that month's dates are not loaded), replacing the per-installment table.
- The "Cancelar" button left (the close button does it); clearer messages for what is missing. The natural-language box of the design is 3.1.
- `AppShell` gains `focus` (full screen on phones).
- Detalle: an installment without a due date says "Cierra 24/1" instead of "Vence" with the closing date.

### 1.10b Detalle
- The expense detail follows the `Detalle` design: back and edit (pencil) buttons, the category icon, description and amount centered with "12 cuotas de $ 89.990" (and "≈ $" for dollars), a data card (Categoría, Pago, Fecha de compra, Espacio and "Gasto fijo" when a recurring expense made it), and "Eliminar gasto" at the end.
- "Cuotas": "3 de 12 · faltan $ 809.910", the segment bar, and the schedule folded to four rows around the current installment ("Ahora", in the statement to pay or the open one), with "Ver las 12 cuotas". Tapping an installment opens a dialog to mark it paid or unpaid or fix its dates. A credit card purchase in one payment shows its single installment; cash in one payment shows none.
- "Cómo se divide" shows each member's part of a hogar expense (from the expense's own space, not the one open).
- Editing description, date and category moved to a dialog.
- The "Compartido" switch of the design (moving an expense between Mi plata and the hogar) needs the API and is part of 9.1; meanwhile the space is shown read-only.

### 1.10b Movimientos
- Movimientos follows its design: the month navigator says "Gastaste $ 486.320 · 38 gastos" (the whole filtered list, from the API's new `totalAmountBase`), filter chips replace the selects (Todos, Fijos, Variables, Categoría and Pago menus), and expenses come grouped by day ("Hoy", "Ayer", "Lun 2") with each day's total and the category icon. A dollar expense shows its dollars and "≈ $" in pesos. Search moved behind the magnifier button. "Cargar más" (50 at a time, up to 200) replaces the page buttons, and the "Agregar gasto" button left (the + in the nav does it).
- New `ui/chip` primitive (44 px filter chip, ink fill when pressed).

### 1.10b Inicio · Hogar
- The hogar's Inicio follows the `Hogar` design and replaces the previous dashboard: the hogar's name with its members, "Gastaron juntos en noviembre" with what each one put, "Cuentas entre ustedes" (who owes whom, "Registrar pago" right there and "Ver detalle" to Deudas; hidden while alone in the hogar), "En qué se fue" (top three categories plus "Otros", the first bar highlighted) and "Últimos compartidos" with who paid each one. "Invitar" leads to the hogar's settings (icon only on phones).
- The screenshot harness adds a second member, two shared expenses and Inicio · Hogar.

### 4.3 (app part): card period nudges
- "Cargá el cierre de este mes de tu Visa" on Inicio and in the expense form (when the picked method is a credit card), during the week before the closing, when this month's dates come from the card's usual days. "Son esas" saves the estimated dates; "Cambiar fechas" opens a dialog with them filled in. Once saved, the nudge goes and statements, Comprometido and installments refresh.
- The card reminders from the API ("Mañana cierra tu Visa", "En 3 días vence tu Visa") have their labels in Notificaciones, and their detail links to Tarjetas or to the statement.

### 4.2 (app part): the new Inicio · Yo
- Inicio in Mi plata follows the designs `Main` and `DesktopInicio`: greeting with the date and the discreet mode button; "Gastaste en noviembre" with what came in and what is left (or how much it went over; without incomes, an invitation to add them; on desktop also the share of the income spent); "Comprometido" across every card, "Diciembre ya tiene $ 214.800 en cuotas." with six bars; "Tarjetas que vencen" with each closed statement still to pay; the latest notification ("Tu semana" for the weekly review); pending drafts; "Últimos movimientos" as a list on mobile and a table on desktop. Desktop lays the cards out in the design's grid.
- The four stat cards, the coach bubble, the income card and the forecast ring are gone from Inicio · Yo. The hogar keeps the previous dashboard until its own design is built (1.10b).
- Not yet: "tu parte" of Hogar expenses inside Yo (the design shows it; today Yo is Mi plata only).

### 4.2 (app part): Comprometido and installments in progress in Tarjetas
- Below the statements, "Comprometido en esta tarjeta": the picked card's next six statements as bars, from its open period, in pesos with the compact amount on top (`$ 235k`). Dollars go in a line below ("Más US$ 12 en dólares (dic)."). In discreet mode the amounts go and the bars stay; screen readers get the list of months and amounts.
- "Cuotas en curso": the card's purchases in installments still being billed, with the monthly amount, the pill bar ("4 de 6") and when it ends ("termina en febrero", with the year when it is not this one).
- Paying a statement, or any statement change, also refreshes Comprometido and the installments in progress.

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
