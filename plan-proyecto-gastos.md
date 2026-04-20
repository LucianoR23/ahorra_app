# Ahorra — Gestión de gastos personal y multi-hogar

**Ahorra** es una app para llevar gastos, ingresos, deudas y objetivos financieros. Pensada para el día a día de una persona o de un hogar compartido (pareja, familia, roommates). Soporta **múltiples hogares por usuario**, **multi-moneda** con tipo de cambio del blue histórico, **gastos compartidos con cuotas**, **libro de deudas** entre miembros, **objetivos con progreso en vivo**, **insights diarios** generados por un worker, y **reporte mensual exportable para IA**.

No es una copia de Splitwise ni de una app de banco — es la mezcla: el lado personal de registrar cada peso que se gasta, más el lado colectivo de ver quién le debe a quién, más el lado reflexivo de entender patrones de consumo con un coach automático.

Este documento describe **cómo va a quedar el producto final**. No es un roadmap de tareas día-a-día; es la especificación. Al final hay un roadmap de checkpoints con slices verticales que marca lo que ya está hecho.

---

## Estado actual del proyecto

> **Fecha de corte:** abril 2026. Marcado con ✅ lo que ya está en código, ⏳ lo que está pendiente.

### Infraestructura y setup

- ✅ Repo `C:\Users\lr231\Desktop\Ahorra\api_go_ahorra` inicializado con git, push a GitHub privado
- ✅ `go mod init github.com/LucianoR23/api_go_ahorra`
- ✅ `docker-compose.yml` con imagen `supabase/postgres:17.4.1.032` (la misma de Coolify), puerto **5433** en host (5432 lo tenía ocupado Postgres nativo de Windows)
- ✅ Volumen persistente + `docker/initdb/*.sql` que crea rol `ahorra` y DB `ahorra` en el primer arranque
- ✅ `.env`, `.env.example`, `.gitignore`
- ✅ `internal/config/env.go` — parser propio de `.env` (sin godotenv), struct `Config`, validación (JWT secrets >= 32 chars)
- ✅ `internal/db/pool.go` — pool `pgxpool` con tuning conservador (MaxConns=10, MinConns=1, lifetimes)
- ✅ `cmd/api/main.go` — entry point con `slog`, carga config, conecta pool, hace `SELECT 1` de smoke test

### Base de datos

- ✅ Migración `000001_init_core.up.sql` aplicada con `golang-migrate`: `users`, `households`, `household_members`
- ✅ Migración `000001_init_core.down.sql`
- ⏳ Migración `000002_payment_methods` — `banks`, `payment_methods`, `credit_cards`
- ⏳ Migración `000003_categories`
- ✅ Migración `000006_expenses` — `expenses`, `expense_installments`, `expense_installment_shares`
- ✅ Migración `000007_credit_card_periods` — override mensual por tarjeta
- ✅ Migración `000010_recurring_expenses`
- ✅ Migración `000009_incomes` — `incomes`, `recurring_incomes`
- ⏳ Migración `settlements` — `settlement_payments`, `household_split_rules`
- ✅ Migración `000011_goals` — `budget_goals`, `daily_insights`
- ✅ Migración `000005_exchange_rates`

### Queries y acceso a datos

- ✅ `sqlc.yaml` configurado con `pgx/v5`, `emit_interface`, overrides `UUID → google/uuid`
- ✅ `internal/db/queries/users.sql`
- ✅ `internal/db/queries/households.sql` con `sqlc.embed`, `IsHouseholdMember`, etc.
- ⏳ Resto de queries (por dominio, se agregan con cada slice vertical)

### API y dominio

- ⏳ Domain entities + errores centinela (`ErrNotFound`, `ErrConflict`, `ErrValidation`, etc.)
- ⏳ Capa `httpx` (helpers de JSON, errores, middlewares base)
- ⏳ Auth (register/login/refresh)
- ⏳ Handlers/services/repos por dominio

### Frontend y worker

- ⏳ Next.js PWA (sin arrancar todavía)
- ⏳ Worker (sin arrancar todavía)

### Deploy

- ⏳ Coolify (Postgres dev + prod, API, Worker, PWA)

---

## Stack

| Componente | Tecnología |
|---|---|
| Backend API | Go 1.25+ con `chi` router |
| Worker (recurrentes, insights, email, fetcher de rates) | Go (goroutines + ticker) |
| Frontend PWA | Next.js 16 (App Router) + TypeScript + shadcn/ui |
| DB dev | PostgreSQL (imagen `supabase/postgres:17.4.1.032`) en Docker local, puerto host **5433** |
| DB prod | PostgreSQL (misma imagen) en Coolify |
| Queries tipadas | `sqlc` con `pgx/v5` |
| Migrations | `golang-migrate` |
| Auth | JWT access 15min en memoria + refresh JWT 7d en httpOnly cookie (rotativo, **sin** tabla) |
| Rate limiting | `golang.org/x/time/rate` con mapa in-memory por IP |
| Tipo de cambio | API `bluelytics.com.ar` (blue USD + blue EUR) fetched cada 15min por el worker |
| Multi-tenant | Tabla `households` con members, rol `owner`/`member`, header `X-Household-ID` |
| Email | Resend (desde el Worker Go) |
| Config | `.env` + parser propio en `internal/config/env.go` (sin `godotenv`) |
| Deploy | Coolify en VPS Oracle ARM |

**Principios del stack:**

- **Sin Redis.** Una instancia de API + una de worker. Caché in-memory con `sync.RWMutex` alcanza.
- **Sin CLI.** La PWA en el celular es más cómoda; la CLI no aporta nada al usuario final.
- **Sin godotenv / viper.** `.env` parseado a mano en ~60 líneas.
- **Sin Docker Desktop a pulmón.** Docker sí, pero solo para la DB local; el binario Go corre en el host.
- **Sin tabla `refresh_tokens`.** Los refresh rotan firmando uno nuevo a cada uso del anterior.

---

## Qué ofrece el producto — features del producto final

### 1. Multi-tenant: hogares (households)

Un usuario puede pertenecer a **varios hogares** (mi depto con mi novia, la casa de mis viejos, un grupo de roommates, la familia). Cada hogar es un espacio aislado: sus propios gastos, categorías, objetivos, recurrentes, deudas.

- Tabla `households` con `name`, `base_currency` (`ARS`/`USD`/`EUR`), `owner_id`.
- Tabla `household_members` con rol `owner` / `member`.
- En cada request autenticado el frontend manda `X-Household-ID: <uuid>`. El middleware valida que el `user_id` del JWT pertenece a ese household. Si no manda el header, usa el default (primer household del usuario).
- **Todas** las tablas de datos (expenses, categories, recurring_expenses, incomes, budget_goals, daily_insights, settlement_payments) cuelgan de `household_id`, no de `user_id`.
- `expenses.created_by` (y análogos) guarda quién registró el movimiento.
- Invitar miembro: por email. Si el email no tiene cuenta, se crea placeholder y al registrarse hereda la invitación.

**Por qué desde el día 1:** migrar de "user-owned" a "household-owned" después implica tocar todos los queries, handlers y FKs. Barato ahora, doloroso después.

### 2. Multi-moneda con tipo de cambio del blue

Los gastos se registran en la moneda en la que ocurrieron; se convierten a la `base_currency` del household **una vez, al crear**, y esa conversión queda congelada.

- Monedas soportadas: `ARS`, `USD`, `EUR`.
- Fuente: `https://api.bluelytics.com.ar/v2/latest` (USD blue + EUR blue).
- El Worker fetchea cada **15 minutos, 24/7**. En fin de semana / feriados el `last_update` de la API no cambia → `ON CONFLICT (currency, source, last_update) DO NOTHING` hace que no se inserten duplicados.
- Durante horario hábil AR (lun-vie 9:00–17:00) se acumulan varias filas por día; fuera de eso el rate queda congelado.
- **Denormalización en cada expense/income:** guardamos `amount`, `currency`, `amount_base`, `base_currency`, `rate_used`, `rate_at`. Si el blue sube 30% mañana, el café de hoy NO se encarece retroactivamente.
- Caché in-memory del último rate por moneda en el API con `sync.RWMutex` (TTL 5 min).
- Tabla `exchange_rates` con histórico completo.

### 3. Medios de pago (por usuario)

Los bancos, tarjetas, wallets y efectivos son **del usuario, no del hogar**. Si uso Santander en el hogar con mi novia y también en el hogar con mis viejos, es el mismo Santander.

- **Bancos**: nombre + `is_active`. Pueden desactivarse, nunca borrarse.
- **Payment methods** con `kind`: `cash`, `debit`, `credit`, `wallet` (MercadoPago, Brubank, etc.), `transfer`.
- **Regla `allows_installments` por kind:**

| kind | allows_installments | Notas |
|---|---|---|
| `cash` | false (forzado) | Efectivo no tiene cuotas |
| `debit` | false (forzado) | Débito descuenta al instante |
| `credit` | true (forzado) | Para eso existe la tarjeta |
| `wallet` | configurable | MP soporta cuotas, Brubank no |
| `transfer` | false (forzado) | Pago único |

- **Credit cards**: detalle ligado 1-a-1 a un payment_method de kind=credit. Tiene `alias`, `last_four`, `default_closing_day`, `default_due_day`, y `debit_payment_method_id` opcional (la cuenta de la que se debita automáticamente).
- **Activate / deactivate, nunca DELETE.** Preservar historial de expenses viejos que referencian ese medio.
- **Bootstrap en registro:** al registrarse un user se crea automáticamente un payment_method `Efectivo` (`kind=cash`, `allows_installments=false`) asociado a él.

### 4. Gastos y cuotas — tabla unificada

Un `expense` representa **la compra en sí** (qué, cuándo, cuánto, con qué medio). El schedule de pago vive en `expense_installments`:

- **1 fila** para cash / debit / transfer / wallet-sin-cuotas (`billing_date = due_date = spent_at`).
- **N filas** para credit en N cuotas, con `billing_date` y `due_date` escalonados según el ciclo de la tarjeta.

**Cálculo de `billing_date` para crédito:**

1. Obtenemos `default_closing_day` (D_cierre) y `default_due_day` (D_venc) de la tarjeta.
2. **Primera cuota:**
   - Si `spent_at.day ≤ D_cierre` → la cuota cierra este mes, vence el mes siguiente (el D_venc del mes siguiente).
   - Si `spent_at.day > D_cierre` → la cuota cierra el mes siguiente, vence dos meses después.
3. **Cuotas 2..N:** incrementan mes a mes respecto a la primera.
4. **Clamp de día:** si el mes no tiene ese día (ej: 31 en febrero), usamos el último día del mes.

**Vistas duales:**

- `view=spent`: filtra por `expenses.spent_at` (cuándo se compró).
- `view=billed`: filtra por `expense_installments.billing_date` (cuándo entra al resumen de la tarjeta).

Útil para responder dos preguntas distintas: "cuánto gasté en abril" vs "cuánto me van a cobrar en el resumen de abril".

### 5. Gastos compartidos

Un expense puede ser `is_shared=false` (personal, del `created_by`) o `is_shared=true` (se divide entre miembros del hogar).

- **`is_shared` es inmutable después de crear.** Si te equivocás, borrás y recreás (Duda 2, opción B).
- **División por pesos:** tabla `household_split_rules` con `weight` decimal por miembro. Se **normalizan** al dividir:
  - weight 0.6 + 0.4 → 60/40
  - weight 1 + 1 + 1 → 33.3/33.3/33.3
  - weight 3 + 2 → 60/40 (el denominador es la suma)
  - Fórmula: `share_i = (weight_i / SUM(weights)) × amount_base`
- **Override por gasto:** el body del POST acepta un array `shares_override` con `{user_id, amount}` que reemplaza el default. Útil para "las cervezas las tomé yo solo" aunque normalmente dividen 50/50.
- **Tabla `expense_installment_shares`:** por cada installment y cada miembro con peso > 0, una fila con `amount_base_owed`. Un expense compartido en 3 cuotas entre 2 miembros genera **3 × 2 = 6 filas**.
- **Deuda activada cuota a cuota (Duda 1, opción B):** el balance solo cuenta shares cuya `installment.billing_date <= CURRENT_DATE`. Si comprás $12.000 en 12 cuotas shared 50/50, tu novia no te debe $6.000 hoy — te debe $500 cuando entre la cuota 1, $1.000 acumulados cuando entre la 2, etc.
- **Delete con CASCADE recalcula balance (Duda 3, opción B):** al borrar un expense, installments y shares desaparecen, los settlements quedan, el balance se recalcula coherentemente. Si había un settlement hecho contra ese gasto, puede quedar saldo negativo en sentido contrario — correcto, porque esa plata ya se movió.

### 6. Libro de deudas entre miembros

El balance entre dos miembros se **calcula on-demand**, nunca se cachea ni materializa. Evita inconsistencias.

Fórmula para "A debe a B":

```
  SUM(shares owed by A sobre expenses creados por B, con billing_date <= hoy)
- SUM(shares owed by B sobre expenses creados por A, con billing_date <= hoy)
- SUM(settlements A → B)
+ SUM(settlements B → A)
```

- `> 0` → A le debe ese monto a B
- `< 0` → B le debe a A
- `= 0` → saldado

**Endpoints:**

- `GET /households/:id/balances` → matriz `[(from, to, amount)]` solo con los no-cero.
- `GET /households/:id/balances/me` → mi balance contra cada otro miembro.

**Settlement payments (botón "pagar"):**

- Un `settlement_payment` no lleva payment method. No descuenta de ningún medio — es puramente un registro del libro. El dinero se movió afuera (transferencia, efectivo, Venmo).
- Body: `{household_id, to_user, amount_base, note?, paid_at?}`.
- **Validación en service: `amount_base ≤ deuda_actual_del_par`.** Si la deuda son $500 no podés registrar un pago de $800.
- Delete de un settlement recalcula el balance (como siempre).

### 7. Ingresos

Los ingresos son **del user que los recibió**, no del hogar. No se comparten ni generan shares. La vista "ingresos del hogar" es un SUM de los ingresos de todos los miembros.

- Tabla `incomes` con `received_by`, `payment_method_id` nullable (por si "te pagaron en efectivo"), `source` (salary, freelance, gift, investment, refund, other).
- Misma denormalización multi-moneda que expenses (`amount`, `currency`, `amount_base`, `base_currency`, `rate_used`, `rate_at`).
- Tabla `recurring_incomes` (sueldo mensual, renta, etc.) con `frequency` y `day_of_month`.
- Worker genera los ingresos recurrentes del día cada madrugada.
- Endpoint `GET /households/:id/totals/income?month=YYYY-MM` devuelve el SUM del household en el período.

### 8. Gastos recurrentes

- Tabla `recurring_expenses` con `frequency` (`monthly`/`weekly`/`yearly`), `day_of_month`, `day_of_week`, `month_of_year`, `is_active`, `starts_at`, `ends_at`, `last_generated`.
- El Worker corre diario a las **00:30**: para cada recurrente activo cuyo `last_generated < período actual`, crea un expense real con `spent_at = día configurado` y actualiza `last_generated`.
- Clamp de día: si `day_of_month=31` y el mes tiene 30, usamos 30.
- `ends_at` vencido → el worker lo desactiva (no genera más).
- UI: la PWA tiene una página `/recurring` para activar/desactivar/editar plantillas.

### 9. Objetivos (budget goals)

Tres tipos:

- **`category_limit`** — "No gastar más de $80.000 en comida este mes" (con `category_id`).
- **`total_limit`** — "No superar $400.000 en total" (sin `category_id`).
- **`savings`** — "Quiero ahorrar $50.000" (se chequea que `ingresos - gastos_pagados_en_el_mes >= target`).

**Dos scopes:**

- `scope='household'` — todos los miembros lo ven y afecta al hogar completo.
- `scope='user'` — personal del miembro (filtra por `received_by` en ingresos y por `user_id` en `expense_installment_shares` para compartidos + expenses personales).

El endpoint `GET /goals` devuelve los objetivos activos **con el progreso en vivo**: `current_amount`, `percentage`, `remaining`, `days_left_in_month`, `daily_budget_remaining`, `status` (`on_track`/`at_risk`/`critical`/`exceeded`), y un `message` en español.

### 10. Insights diarios (el coach)

Cards que aparecen en el dashboard, generadas por el Worker a las **01:00 AM**.

- **Nivel 1 — determinístico, sin IA.** Lo que se implementa ahora:
  - `daily_summary` — resumen del día anterior (qué se gastó, en qué categorías, comparado con el objetivo).
  - `alert` — objetivo con >80% usado y todavía queda tiempo.
  - `tip` — patrones detectados cada 3 días (gasto por día de semana, categoría que subió mucho).
  - `weekly_review` — los domingos, resumen de la semana vs la anterior.
- **Nivel 2 — con IA, feature de v2.** Mandar el JSON del reporte a Claude Sonnet vía API y pedir insights personalizados. El endpoint ya está diseñado para soportarlo sin cambios estructurales.

Tabla `daily_insights` con `insight_type`, `title`, `body`, `severity` (`info`/`warning`/`critical`), `is_read`, `metadata` JSONB, y unique `(household_id, user_id, insight_date, insight_type)` para evitar duplicados si el worker corre dos veces.

### 11. Reporte mensual para IA

Endpoint `GET /reports/ai-export?month=YYYY-MM&format=json|markdown`.

- Formato **JSON**: estructura completa con `summary`, `by_category`, `recurring_summary`, `trends`, `daily_pattern`, `top_expenses`, `all_expenses`.
- Formato **Markdown**: texto plano listo para pegar en Claude/ChatGPT con un prompt al final.
- **Separación gastos recurrentes vs variables** — el dato más útil para una IA financiera. Sin eso, "gastaste $485.000" no dice nada; con eso: "$195.000 son recurrentes inflexibles, $290.000 son variables donde podés optimizar".
- Email mensual (primer día del mes 08:00) con Resend: resumen en HTML + link a exportar para IA.

### 12. Auth

- **Register** → hash bcrypt + crea `user` + crea `payment_method` Efectivo + crea household "Mi hogar" (base_currency=ARS) + inserta `household_members` owner + inserta `household_split_rules` weight=1.0 + inserta categorías default (Comida, Hogar, Transporte, Entretenimiento, Servicios, Salud, Otros). Todo en **una transacción**.
- **Login** → access token JWT 15min + refresh token JWT 7d. El access va en el body JSON, el refresh en `Set-Cookie` httpOnly Secure SameSite=Strict.
- **Refresh rotativo sin tabla** → el endpoint `/auth/refresh` valida el refresh cookie, firma un nuevo access + un nuevo refresh, sobrescribe el cookie. El refresh viejo queda huérfano y solo vive hasta su `exp` natural. Apto para 2-5 usuarios (uso personal). Si algún día se necesita logout remoto o detección de robo, se agrega tabla.
- **Logout** → `Set-Cookie` con `Max-Age=0`.
- **Middleware de auth** → extrae JWT, valida firma + exp, inyecta `user_id` en contexto. Un middleware separado lee `X-Household-ID` y valida membership → inyecta `household_id` en contexto.

### 13. Rate limiting y CORS

- **Rate limiting** con `golang.org/x/time/rate`. Mapa in-memory `ip → *rate.Limiter` con GC cada 5 min de clientes inactivos. Dos configuraciones:
  - Login / refresh / register: ~6 req/min con burst 5.
  - Resto: 2 rps con burst 20.
- **CORS**: lista blanca de orígenes desde `ALLOWED_ORIGINS` en `.env`. Nunca `*` con `credentials`.

---

## Arquitectura en capas

```
┌─────────────────────────────────────────────┐
│  Next.js 16 PWA (frontend)                  │
│  - Login / register / refresh automático    │
│  - Dashboard: goals + insights + resumen    │
│  - CRUD expenses / incomes / recurring      │
│  - Deudas del hogar + botón pagar           │
│  - Medios de pago / tarjetas / bancos       │
│  - Reportes + AI export                     │
│  - Instalable en celular                    │
└──────────────┬──────────────────────────────┘
               │ HTTPS + JSON
               │ Authorization: Bearer <access>
               │ Cookie: refresh (httpOnly)
               │ X-Household-ID: <uuid>
               ▼
┌─────────────────────────────────────────────┐
│  Go API (cmd/api) — chi router              │
│  handler → service → repository → sqlcgen   │
│        ↑              ↑                     │
│        └── domain (types + sentinel errs) ──┘
│  Middlewares: logger, recovery, cors,       │
│               rate-limit, auth, household   │
└────┬──────────────────────────┬─────────────┘
     │                          │
     ▼                          ▼
┌──────────────────────┐   ┌──────────────────────┐
│ PostgreSQL 17.4      │   │ Go Worker (cmd/worker)│
│ (supabase/postgres   │◄──│ - Rate fetcher 15min │
│  en Coolify)         │   │ - Recurrentes 00:30  │
│                      │   │ - Insights 01:00     │
│                      │   │ - Email mensual      │
└──────────────────────┘   └──────────────────────┘
```

### Responsabilidades de cada capa

```
handler → service → repository → sqlcgen (DB)
             ↑           ↑
             └── domain (types + errores centinela) ──┘
```

- **Handler** — traduce HTTP ↔ domain. Parsea body/query/headers, llama service, serializa respuesta, mapea errores de dominio a códigos HTTP (`ErrNotFound→404`, `ErrValidation→400`, `ErrConflict→409`, `ErrUnauthorized→401`, `ErrForbidden→403`).
- **Service** — lógica de negocio, validaciones, transacciones. No conoce HTTP. No conoce SQL directo (solo repos).
- **Repository** — traduce `sqlcgen` ↔ `domain`. Mapea `pgx.ErrNoRows` a `domain.ErrNotFound`, errores de unique a `ErrConflict`, etc. Acepta `pgx.Tx` o `*pgxpool.Pool` como executor (para que el service pueda orquestar transacciones).
- **Domain** — tipos del dominio (Expense, Installment, Share, etc.) y errores centinela:
  ```go
  var (
      ErrNotFound     = errors.New("not found")
      ErrConflict     = errors.New("conflict")
      ErrUnauthorized = errors.New("unauthorized")
      ErrForbidden    = errors.New("forbidden")
      ErrValidation   = errors.New("validation")
  )
  ```
- **sqlcgen** — código generado por `sqlc`. No se edita a mano. Usa `pgx/v5` como driver.

### Decisión: Next.js + SWR + Server Actions

Contra un Go API externo, la configuración correcta según docs de Next.js 16:

- **Lecturas** → fetch directo al Go API desde client components, cacheado con SWR. Server Actions NO están diseñadas para lecturas (usan POST interno).
- **Mutaciones** → Server Actions que actúan de proxy al Go API. Esto mantiene el access token en server-side, lejos del JavaScript del browser.
- **Evitar Route Handlers** como proxy genérico: sería doble hop sin valor (Next → /api/x → Go API).

```
Lectura:   Client Component → SWR → fetch(GO_API) → datos
Escritura: Client Component → Server Action → fetch(GO_API) → revalidar
```

---

## Estructura de carpetas

### Backend Go — `api_go_ahorra/`

```
api_go_ahorra/
├── cmd/
│   ├── api/
│   │   └── main.go                     # HTTP server + graceful shutdown
│   └── worker/
│       └── main.go                     # Tickers + cron interno
│
├── internal/
│   ├── config/
│   │   └── env.go                      # Parser propio .env + struct Config + Load()
│   │
│   ├── db/
│   │   ├── pool.go                     # pgxpool con tuning
│   │   ├── queries/                    # SQL para sqlc, una carpeta por dominio
│   │   │   ├── users.sql
│   │   │   ├── households.sql
│   │   │   ├── banks.sql
│   │   │   ├── payment_methods.sql
│   │   │   ├── credit_cards.sql
│   │   │   ├── categories.sql
│   │   │   ├── expenses.sql
│   │   │   ├── installments.sql
│   │   │   ├── shares.sql
│   │   │   ├── recurring_expenses.sql
│   │   │   ├── incomes.sql
│   │   │   ├── recurring_incomes.sql
│   │   │   ├── settlements.sql
│   │   │   ├── goals.sql
│   │   │   ├── insights.sql
│   │   │   └── exchange_rates.sql
│   │   └── sqlc/                       # Código generado (no editar)
│   │
│   ├── domain/
│   │   ├── errors.go                   # ErrNotFound, ErrConflict, ...
│   │   ├── user.go
│   │   ├── household.go
│   │   ├── payment_method.go
│   │   ├── expense.go
│   │   ├── income.go
│   │   ├── settlement.go
│   │   ├── goal.go
│   │   ├── insight.go
│   │   └── exchange_rate.go
│   │
│   ├── httpx/                          # Helpers HTTP + middlewares genéricos
│   │   ├── json.go                     # Write/Read JSON con errors
│   │   ├── errors.go                   # Mapper domain→HTTP
│   │   ├── logger.go
│   │   ├── recovery.go
│   │   ├── cors.go
│   │   └── ratelimit.go
│   │
│   ├── auth/
│   │   ├── handler.go
│   │   ├── service.go                  # register, login, refresh, logout
│   │   ├── jwt.go                      # sign/verify access + refresh
│   │   ├── password.go                 # bcrypt hash/verify
│   │   └── middleware.go               # valida JWT, inyecta user_id
│   │
│   ├── users/                          # handler + service + repo
│   ├── households/                     # + middleware que valida X-Household-ID
│   ├── paymethods/                     # banks + payment_methods + credit_cards
│   ├── categories/
│   ├── expenses/                       # expenses + installments + shares
│   ├── incomes/                        # incomes + recurring_incomes
│   ├── settlements/
│   ├── goals/
│   ├── insights/
│   ├── exchange/                       # fetcher + repo + caché con sync.RWMutex
│   ├── reports/                        # monthly, trends, ai-export (JSON + MD)
│   ├── email/                          # cliente Resend + templates
│   └── worker/                         # orquesta los jobs del cmd/worker
│
├── migrations/
│   ├── 000001_init_core.up.sql         # ✅ aplicada
│   ├── 000001_init_core.down.sql       # ✅
│   ├── 000002_payment_methods.up.sql
│   ├── 000002_payment_methods.down.sql
│   ├── 000003_categories.up.sql
│   ├── 000003_categories.down.sql
│   ├── 000004_expenses.up.sql
│   ├── 000004_expenses.down.sql
│   ├── 000005_incomes.up.sql
│   ├── 000005_incomes.down.sql
│   ├── 000006_settlements.up.sql
│   ├── 000006_settlements.down.sql
│   ├── 000007_goals.up.sql
│   ├── 000007_goals.down.sql
│   ├── 000008_exchange_rates.up.sql
│   └── 000008_exchange_rates.down.sql
│
├── docker/
│   └── initdb/
│       └── 001_create_role_db.sql      # Crea rol ahorra + DB ahorra en primer arranque
│
├── sqlc.yaml
├── docker-compose.yml                  # Solo Postgres local en puerto 5433
├── .env
├── .env.example
├── .gitignore
├── go.mod
├── go.sum
└── Dockerfile                          # Multi-stage, mismo binario sirve API y Worker
```

### Frontend Next.js PWA — `ahorra-pwa/`

```
ahorra-pwa/
├── app/
│   ├── layout.tsx
│   ├── manifest.ts
│   ├── (auth)/
│   │   ├── layout.tsx
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   └── (app)/
│       ├── layout.tsx                  # Household switcher + bottom nav
│       ├── page.tsx                    # Dashboard: goals + insights + resumen
│       ├── expenses/
│       │   ├── page.tsx                # Lista con filtros (mes, spent/billed, tipo, medio)
│       │   ├── new/page.tsx            # Form con cuotas, is_shared, override shares
│       │   └── [id]/page.tsx           # Detalle con installments
│       ├── incomes/
│       │   ├── page.tsx
│       │   └── new/page.tsx
│       ├── recurring/
│       │   ├── page.tsx
│       │   └── new/page.tsx
│       ├── debts/
│       │   ├── page.tsx                # Matriz del hogar
│       │   └── me/page.tsx             # Mi balance con cada miembro + botón pagar
│       ├── goals/
│       │   └── page.tsx
│       ├── reports/
│       │   ├── page.tsx                # Gráficos mensuales (recharts)
│       │   └── ai-export/page.tsx      # JSON + Markdown copiable
│       └── settings/
│           ├── page.tsx
│           ├── households/page.tsx     # Editar, invitar, split
│           ├── banks/page.tsx
│           ├── payment-methods/page.tsx
│           └── categories/page.tsx
│
├── components/
│   ├── expense-form.tsx
│   ├── installments-preview.tsx        # Previsualiza billing_date por cuota
│   ├── share-editor.tsx                # UI para override de shares
│   ├── goal-card.tsx
│   ├── insight-card.tsx
│   ├── balance-matrix.tsx
│   ├── pay-debt-modal.tsx
│   ├── household-switcher.tsx
│   └── ui/                             # shadcn/ui
│
├── lib/
│   ├── api.ts                          # Cliente HTTP tipado (SWR + Server Actions)
│   ├── auth.ts                         # Access token en memoria + refresh flow
│   └── utils.ts                        # Formateo ARS, fechas, porcentajes
│
├── hooks/
│   ├── use-expenses.ts
│   ├── use-goals.ts
│   ├── use-balances.ts
│   └── use-auth.ts
│
├── types/
│   └── index.ts                        # Expense, Installment, Share, Income,
│                                       # Settlement, Goal, PaymentMethod, CreditCard,
│                                       # Balance, Insight, Household, Category
│
├── public/
│   ├── icon-192.png
│   ├── icon-512.png
│   └── sw.js                           # Service worker básico
│
├── next.config.ts
├── tailwind.config.ts
├── package.json
└── .env.local                          # NEXT_PUBLIC_API_URL=...
```

---

## Schema de base de datos

El schema se implementa en migraciones **incrementales por dominio**, no una mega-migración con 18 tablas de una. Cada slice vertical trae su migración + sus queries + su módulo Go.

### Extensiones

```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";  -- gen_random_uuid()
```

### 000001 — Core (users + households) ✅ aplicada

```sql
CREATE TABLE users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email       TEXT NOT NULL UNIQUE,
    password    TEXT NOT NULL,
    name        TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE households (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name           TEXT NOT NULL,
    base_currency  TEXT NOT NULL DEFAULT 'ARS' CHECK (base_currency IN ('ARS', 'USD', 'EUR')),
    owner_id       UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE household_members (
    household_id  UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role          TEXT NOT NULL CHECK (role IN ('owner', 'member')),
    joined_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (household_id, user_id)
);

CREATE INDEX idx_household_members_user ON household_members(user_id);
```

### 000002 — Payment methods

```sql
-- Los bancos pertenecen al usuario. Mi caja de ahorro es mía.
CREATE TABLE banks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_user_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(owner_user_id, name)
);

CREATE TABLE payment_methods (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    bank_id              UUID REFERENCES banks(id) ON DELETE SET NULL,
    name                 TEXT NOT NULL,
    kind                 TEXT NOT NULL CHECK (kind IN ('cash','debit','credit','wallet','transfer')),
    allows_installments  BOOLEAN NOT NULL DEFAULT false,
    is_active            BOOLEAN NOT NULL DEFAULT true,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(owner_user_id, name)
);

CREATE TABLE credit_cards (
    id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_method_id         UUID NOT NULL UNIQUE REFERENCES payment_methods(id) ON DELETE CASCADE,
    alias                     TEXT NOT NULL,
    last_four                 TEXT CHECK (last_four IS NULL OR last_four ~ '^[0-9]{4}$'),
    default_closing_day       INT NOT NULL CHECK (default_closing_day BETWEEN 1 AND 31),
    default_due_day           INT NOT NULL CHECK (default_due_day BETWEEN 1 AND 31),
    debit_payment_method_id   UUID REFERENCES payment_methods(id) ON DELETE SET NULL,
    created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_banks_owner ON banks(owner_user_id) WHERE is_active = true;
CREATE INDEX idx_payment_methods_owner ON payment_methods(owner_user_id) WHERE is_active = true;
```

### 000003 — Categories

```sql
CREATE TABLE categories (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id  UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    name          TEXT NOT NULL,
    icon          TEXT NOT NULL DEFAULT '💰',
    color         TEXT NOT NULL DEFAULT '#2E75B6',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(household_id, name)
);

CREATE INDEX idx_categories_household ON categories(household_id);
```

### 000004 — Expenses + installments + shares + recurring

```sql
CREATE TABLE expenses (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id       UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    created_by         UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    category_id        UUID REFERENCES categories(id) ON DELETE SET NULL,
    payment_method_id  UUID NOT NULL REFERENCES payment_methods(id) ON DELETE RESTRICT,

    amount             NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    currency           TEXT NOT NULL DEFAULT 'ARS' CHECK (currency IN ('ARS','USD','EUR')),
    amount_base        NUMERIC(14, 2) NOT NULL,
    base_currency      TEXT NOT NULL CHECK (base_currency IN ('ARS','USD','EUR')),
    rate_used          NUMERIC(12, 4),
    rate_at            TIMESTAMPTZ,

    description        TEXT NOT NULL,
    spent_at           DATE NOT NULL DEFAULT CURRENT_DATE,

    installments       INT NOT NULL DEFAULT 1 CHECK (installments BETWEEN 1 AND 60),
    is_shared          BOOLEAN NOT NULL DEFAULT false,

    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1 fila para cash/debit/transfer/wallet-sin-cuotas, N filas para credit
CREATE TABLE expense_installments (
    id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_id                UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    installment_number        INT NOT NULL CHECK (installment_number >= 1),
    installment_amount        NUMERIC(12, 2) NOT NULL CHECK (installment_amount > 0),
    installment_amount_base   NUMERIC(14, 2) NOT NULL,
    billing_date              DATE NOT NULL,
    due_date                  DATE,
    is_paid                   BOOLEAN NOT NULL DEFAULT false,
    paid_at                   TIMESTAMPTZ,
    created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(expense_id, installment_number)
);

CREATE INDEX idx_installments_expense ON expense_installments(expense_id);
CREATE INDEX idx_installments_billing ON expense_installments(billing_date);

-- Shares por cuota. Solo si expenses.is_shared = true.
-- Cuota × miembros con weight > 0.
CREATE TABLE expense_installment_shares (
    installment_id    UUID NOT NULL REFERENCES expense_installments(id) ON DELETE CASCADE,
    user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount_base_owed  NUMERIC(14, 2) NOT NULL CHECK (amount_base_owed >= 0),
    PRIMARY KEY (installment_id, user_id)
);

CREATE INDEX idx_installment_shares_user ON expense_installment_shares(user_id);

CREATE TABLE recurring_expenses (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id       UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    created_by         UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    category_id        UUID REFERENCES categories(id) ON DELETE SET NULL,
    payment_method_id  UUID NOT NULL REFERENCES payment_methods(id) ON DELETE RESTRICT,

    amount             NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    currency           TEXT NOT NULL DEFAULT 'ARS' CHECK (currency IN ('ARS','USD','EUR')),
    description        TEXT NOT NULL,

    frequency          TEXT NOT NULL CHECK (frequency IN ('monthly','weekly','yearly')),
    day_of_month       INT CHECK (day_of_month BETWEEN 1 AND 31),
    day_of_week        INT CHECK (day_of_week BETWEEN 0 AND 6),
    month_of_year      INT CHECK (month_of_year BETWEEN 1 AND 12),

    is_shared          BOOLEAN NOT NULL DEFAULT false,
    is_active          BOOLEAN NOT NULL DEFAULT true,
    starts_at          DATE NOT NULL DEFAULT CURRENT_DATE,
    ends_at            DATE,
    last_generated     DATE,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_expenses_household_date     ON expenses(household_id, spent_at DESC);
CREATE INDEX idx_expenses_household_category ON expenses(household_id, category_id);
CREATE INDEX idx_expenses_created_by         ON expenses(created_by);
CREATE INDEX idx_expenses_shared             ON expenses(household_id, is_shared) WHERE is_shared = true;
CREATE INDEX idx_recurring_household_active  ON recurring_expenses(household_id, is_active) WHERE is_active = true;
```

### 000005 — Incomes

```sql
CREATE TABLE incomes (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id       UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    received_by        UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    payment_method_id  UUID REFERENCES payment_methods(id) ON DELETE SET NULL,

    amount             NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    currency           TEXT NOT NULL DEFAULT 'ARS' CHECK (currency IN ('ARS','USD','EUR')),
    amount_base        NUMERIC(14, 2) NOT NULL,
    base_currency      TEXT NOT NULL CHECK (base_currency IN ('ARS','USD','EUR')),
    rate_used          NUMERIC(12, 4),
    rate_at            TIMESTAMPTZ,

    source             TEXT NOT NULL CHECK (source IN ('salary','freelance','gift','investment','refund','other')),
    description        TEXT NOT NULL,
    received_at        DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE recurring_incomes (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id       UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    received_by        UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    payment_method_id  UUID REFERENCES payment_methods(id) ON DELETE SET NULL,

    amount             NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    currency           TEXT NOT NULL DEFAULT 'ARS' CHECK (currency IN ('ARS','USD','EUR')),
    description        TEXT NOT NULL,
    source             TEXT NOT NULL CHECK (source IN ('salary','freelance','gift','investment','refund','other')),

    frequency          TEXT NOT NULL CHECK (frequency IN ('monthly','weekly','yearly')),
    day_of_month       INT CHECK (day_of_month BETWEEN 1 AND 31),
    day_of_week        INT CHECK (day_of_week BETWEEN 0 AND 6),
    month_of_year      INT CHECK (month_of_year BETWEEN 1 AND 12),

    is_active          BOOLEAN NOT NULL DEFAULT true,
    starts_at          DATE NOT NULL DEFAULT CURRENT_DATE,
    ends_at            DATE,
    last_generated     DATE,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_incomes_household_date         ON incomes(household_id, received_at DESC);
CREATE INDEX idx_incomes_received_by            ON incomes(received_by);
CREATE INDEX idx_recurring_incomes_household_active ON recurring_incomes(household_id, is_active) WHERE is_active = true;
```

### 000006 — Settlements + split rules

```sql
-- Pesos para dividir gastos compartidos. weight decimal libre, se normaliza al dividir.
-- Default al entrar al household: weight=1.0 → división equitativa.
CREATE TABLE household_split_rules (
    household_id  UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    weight        NUMERIC(8, 4) NOT NULL DEFAULT 1.0 CHECK (weight >= 0),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (household_id, user_id)
);

-- Un settlement_payment registra "A le pagó X a B para saldar deuda".
-- No lleva payment_method — es solo un registro del libro de deudas.
-- El service valida amount <= deuda actual del par.
CREATE TABLE settlement_payments (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id   UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    from_user      UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    to_user        UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    amount_base    NUMERIC(14, 2) NOT NULL CHECK (amount_base > 0),
    base_currency  TEXT NOT NULL CHECK (base_currency IN ('ARS','USD','EUR')),
    note           TEXT,
    paid_at        DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (from_user <> to_user)
);

CREATE INDEX idx_settlements_household ON settlement_payments(household_id);
CREATE INDEX idx_settlements_pair      ON settlement_payments(household_id, from_user, to_user);
```

### 000007 — Goals + insights

```sql
CREATE TABLE budget_goals (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id   UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    scope          TEXT NOT NULL DEFAULT 'household' CHECK (scope IN ('household','user')),
    user_id        UUID REFERENCES users(id) ON DELETE CASCADE,  -- obligatorio si scope='user'
    category_id    UUID REFERENCES categories(id) ON DELETE CASCADE,
    goal_type      TEXT NOT NULL CHECK (goal_type IN ('category_limit','total_limit','savings')),
    target_amount  NUMERIC(12, 2) NOT NULL CHECK (target_amount > 0),
    currency       TEXT NOT NULL DEFAULT 'ARS' CHECK (currency IN ('ARS','USD','EUR')),
    period         TEXT NOT NULL DEFAULT 'monthly' CHECK (period IN ('monthly','weekly')),
    is_active      BOOLEAN NOT NULL DEFAULT true,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK ((scope = 'household' AND user_id IS NULL) OR (scope = 'user' AND user_id IS NOT NULL))
);

CREATE TABLE daily_insights (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id  UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    user_id       UUID REFERENCES users(id) ON DELETE CASCADE,  -- null = insight del hogar
    insight_date  DATE NOT NULL,
    insight_type  TEXT NOT NULL,
    title         TEXT NOT NULL,
    body          TEXT NOT NULL,
    severity      TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info','warning','critical')),
    is_read       BOOLEAN NOT NULL DEFAULT false,
    metadata      JSONB NOT NULL DEFAULT '{}',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(household_id, user_id, insight_date, insight_type)
);

CREATE INDEX idx_goals_household      ON budget_goals(household_id, is_active) WHERE is_active = true;
CREATE INDEX idx_goals_user_active    ON budget_goals(user_id, is_active)      WHERE is_active = true AND user_id IS NOT NULL;
CREATE INDEX idx_insights_household_date ON daily_insights(household_id, insight_date DESC);
CREATE INDEX idx_insights_user_date      ON daily_insights(user_id, insight_date DESC) WHERE user_id IS NOT NULL;
CREATE INDEX idx_insights_unread         ON daily_insights(household_id, is_read)      WHERE is_read = false;
```

### 000008 — Exchange rates

```sql
CREATE TABLE exchange_rates (
    currency     TEXT NOT NULL CHECK (currency IN ('USD','EUR')),
    source       TEXT NOT NULL DEFAULT 'blue' CHECK (source IN ('blue','oficial')),
    last_update  TIMESTAMPTZ NOT NULL,
    rate_avg     NUMERIC(12, 4) NOT NULL CHECK (rate_avg > 0),
    rate_buy     NUMERIC(12, 4) NOT NULL,
    rate_sell    NUMERIC(12, 4) NOT NULL,
    fetched_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (currency, source, last_update)
);

CREATE INDEX idx_exchange_rates_latest ON exchange_rates(currency, source, last_update DESC);
```

### Bootstrap (desde service, no desde migration)

**Al registrar un usuario:**

1. `INSERT user`
2. `INSERT payment_method "Efectivo"` (`kind=cash`, `allows_installments=false`) asociado al user
3. `INSERT household "Mi hogar"` (`owner=user`, `base_currency='ARS'`)
4. `INSERT household_members` (household, user, `'owner'`)
5. `INSERT household_split_rules` (household, user, `weight=1.0`)
6. `INSERT categorías default` para ese household: Comida, Hogar, Transporte, Entretenimiento, Servicios, Salud, Otros

Todo en una transacción. Si algo falla, rollback completo.

**Al agregar un miembro a un household:**

1. `INSERT household_members` (household, new_user, `'member'`)
2. `INSERT household_split_rules` (household, new_user, `weight=1.0`)

---

## API Endpoints

> **Contexto de household.** Salvo auth, todos los endpoints autenticados esperan header `X-Household-ID: <uuid>`. El middleware valida que el `user_id` del JWT es member de ese household. Si no manda el header, se usa el default (primer household del user).

### Auth

| Método | Ruta | Descripción | Auth |
|---|---|---|---|
| POST | `/auth/register` | Crear cuenta (hace todo el bootstrap) | No |
| POST | `/auth/login` | Login → access token (body) + refresh cookie | No |
| POST | `/auth/refresh` | Refrescar tokens (rota el refresh) | Cookie |
| POST | `/auth/logout` | Borra cookie de refresh | Sí |
| GET | `/auth/me` | Datos del user + listado de sus households | Sí |

### Households

| Método | Ruta | Descripción | Auth |
|---|---|---|---|
| GET | `/households` | Hogares a los que pertenezco | Sí |
| POST | `/households` | Crear hogar nuevo | Sí |
| PUT | `/households/:id` | Editar nombre / base_currency | Owner |
| POST | `/households/:id/invite` | Invitar otro user por email | Owner |
| DELETE | `/households/:id/members/:userId` | Remover miembro | Owner |
| GET | `/households/:id/split` | Ver pesos de división actuales | Miembro |
| PUT | `/households/:id/split` | Actualizar pesos en batch | Owner |
| GET | `/households/:id/balances` | Matriz de deudas entre miembros | Miembro |
| GET | `/households/:id/balances/me` | Mi balance con cada miembro | Miembro |
| GET | `/households/:id/totals/income` | Ingreso total del hogar en período | Miembro |

### Banks y Payment Methods (por usuario)

| Método | Ruta | Descripción | Auth |
|---|---|---|---|
| GET | `/banks` | Listar mis bancos | Sí |
| POST | `/banks` | Crear banco | Sí |
| PUT | `/banks/:id` | Editar | Owner del banco |
| PATCH | `/banks/:id/deactivate` | Desactivar (nunca DELETE) | Owner |
| PATCH | `/banks/:id/activate` | Reactivar | Owner |
| GET | `/payment-methods` | Listar mis medios | Sí |
| POST | `/payment-methods` | Crear medio | Sí |
| PUT | `/payment-methods/:id` | Editar | Owner |
| PATCH | `/payment-methods/:id/deactivate` | Desactivar | Owner |
| PATCH | `/payment-methods/:id/activate` | Reactivar | Owner |
| POST | `/payment-methods/:id/credit-card` | Agregar detalle de tarjeta | Owner |
| PUT | `/payment-methods/:id/credit-card` | Editar detalle de tarjeta | Owner |

### Categories (por hogar)

| Método | Ruta | Descripción | Auth |
|---|---|---|---|
| GET | `/categories` | Categorías del hogar actual | Miembro |
| POST | `/categories` | Crear | Miembro |
| PUT | `/categories/:id` | Editar | Miembro |
| DELETE | `/categories/:id` | Eliminar | Miembro |

### Expenses

| Método | Ruta | Descripción | Auth |
|---|---|---|---|
| GET | `/expenses?month=YYYY-MM&view=spent\|billed&type=all\|personal\|shared&payment_method_id=...` | Listar | Miembro |
| GET | `/expenses/:id` | Detalle (incluye installments + shares) | Miembro |
| POST | `/expenses` | Crear (body incluye installments, is_shared, shares_override) | Miembro |
| PUT | `/expenses/:id` | Editar (NO se puede cambiar is_shared; regenera hijos si cambia amount/installments) | Creator |
| DELETE | `/expenses/:id` | Eliminar (CASCADE en installments + shares; balance recalcula) | Creator |
| PATCH | `/expenses/:id/installments/:n/pay` | Marcar cuota N como pagada | Creator |

### Incomes

| Método | Ruta | Descripción | Auth |
|---|---|---|---|
| GET | `/incomes?month=YYYY-MM&user=me\|all` | Listar | Miembro |
| POST | `/incomes` | Registrar | Miembro |
| PUT | `/incomes/:id` | Editar | Receiver |
| DELETE | `/incomes/:id` | Eliminar | Receiver |
| GET | `/incomes/recurring` | Listar recurrentes activos | Miembro |
| POST | `/incomes/recurring` | Crear recurrente | Miembro |
| PUT | `/incomes/recurring/:id` | Editar | Receiver |
| DELETE | `/incomes/recurring/:id` | Desactivar | Receiver |

### Recurring expenses

| Método | Ruta | Descripción | Auth |
|---|---|---|---|
| GET | `/recurring` | Listar activos | Miembro |
| POST | `/recurring` | Crear | Miembro |
| PUT | `/recurring/:id` | Editar | Creator |
| DELETE | `/recurring/:id` | Desactivar (soft delete) | Creator |
| POST | `/recurring/generate` | Trigger manual de generación | Miembro |

### Settlements

| Método | Ruta | Descripción | Auth |
|---|---|---|---|
| POST | `/settlements` | Registrar pago de deuda (valida amount ≤ deuda actual) | Debtor |
| DELETE | `/settlements/:id` | Anular pago (recalcula balance) | Creator |

### Goals

| Método | Ruta | Descripción | Auth |
|---|---|---|---|
| GET | `/goals` | Objetivos activos con progreso en vivo | Miembro |
| POST | `/goals` | Crear (scope household o user) | Miembro |
| PUT | `/goals/:id` | Editar | Owner del goal |
| DELETE | `/goals/:id` | Desactivar | Owner del goal |

### Insights

| Método | Ruta | Descripción | Auth |
|---|---|---|---|
| GET | `/insights/today` | Insights del día (genera si no existen) | Miembro |
| GET | `/insights?days=7` | Historial | Miembro |
| PATCH | `/insights/:id/read` | Marcar como leído | Owner |

### Reports

| Método | Ruta | Descripción | Auth |
|---|---|---|---|
| GET | `/reports/monthly?month=YYYY-MM` | Resumen por categoría | Miembro |
| GET | `/reports/trends` | Tendencia últimos 6 meses | Miembro |
| GET | `/reports/ai-export?month=YYYY-MM&format=json\|markdown` | Export para IA | Miembro |

### Exchange rates

| Método | Ruta | Descripción | Auth |
|---|---|---|---|
| GET | `/rates/latest` | Último blue USD + EUR | Sí |
| GET | `/rates?from=...&to=...&currency=USD` | Histórico | Sí |

### Health

| Método | Ruta | Descripción | Auth |
|---|---|---|---|
| GET | `/health/live` | Liveness (proceso vivo) | No |
| GET | `/health/ready` | Readiness (DB conectada) | No |

---

## Flujos clave

### Flujo 1: Register + bootstrap

```
POST /auth/register { name, email, password }
  ↓ service (transaccional)
  1. bcrypt hash de password
  2. INSERT user
  3. INSERT payment_method "Efectivo" (kind=cash)
  4. INSERT household "Mi hogar" (base_currency=ARS, owner=user)
  5. INSERT household_members (owner)
  6. INSERT household_split_rules (weight=1.0)
  7. INSERT categorías default
  ↓
  firma access token (15min) + refresh token (7d)
  ↓
  Set-Cookie: refresh httpOnly Secure SameSite=Strict
  200 { access, user }
```

### Flujo 2: Login → llamar endpoint autenticado → refresh automático

```
POST /auth/login { email, password }
  ↓
  Go valida bcrypt, firma access + refresh
  ↓
  Set-Cookie refresh, body { access, user }
  ↓
Next.js guarda access EN MEMORIA (no localStorage).
Cada request: Authorization: Bearer <access>, X-Household-ID: <uuid>

Cuando access expira (401):
  Next.js → POST /auth/refresh (cookie se manda automática)
  Go valida refresh token, firma NUEVO access + NUEVO refresh,
  sobrescribe cookie, devuelve access en body.
  Next.js reintenta la request original.

Logout:
  POST /auth/logout → Set-Cookie refresh Max-Age=0
```

### Flujo 3: Crear un gasto con cuotas compartido

```
POST /expenses
{
  "amount": 12000,
  "currency": "ARS",
  "description": "Viaje Bariloche",
  "spent_at": "2026-04-18",
  "category_id": "uuid-viajes",
  "payment_method_id": "uuid-visa-santander",
  "installments": 12,
  "is_shared": true,
  "shares_override": null   // usa split default 50/50
}

Service (en transacción):
  1. Validar member del household.
  2. Validar payment_method.owner_user_id = created_by.
  3. Si installments > 1: payment_method.allows_installments debe ser true.
  4. Cargar household → base_currency.
  5. Si currency != base_currency: cargar rate más reciente, calcular amount_base.
     Si coinciden: amount_base = amount, rate_used=NULL, rate_at=NULL.
  6. INSERT expense.
  7. Calcular schedule:
     - credit → 12 filas en expense_installments con billing_date escalonado
       según closing_day de la tarjeta.
     - cash/debit/wallet/transfer → 1 fila con billing_date = spent_at.
     installment_amount = amount / N, installment_amount_base = amount_base / N
     (redondeando; la última cuota absorbe el redondeo para cerrar exacto).
  8. Si is_shared=true:
     - Cargar household_split_rules WHERE weight > 0.
     - Para cada installment × miembro: INSERT expense_installment_shares
       con amount_base_owed = installment_amount_base × (weight_i / SUM(weights)).
     - Si vino shares_override, usarlo en vez del default (normalizado para sumar exactamente el amount de cada cuota).
  9. COMMIT.

Response: 201 { expense con installments y shares embebidos }
```

### Flujo 4: Ver deudas del hogar

```
GET /households/:id/balances
  ↓
Service arma la matriz on-demand con un par de queries agregadas:

  SELECT
    ei_creator.created_by AS creditor,
    s.user_id             AS debtor,
    SUM(s.amount_base_owed) AS activated_owed
  FROM expense_installment_shares s
  JOIN expense_installments ei ON ei.id = s.installment_id
  JOIN expenses e               ON e.id = ei.expense_id
  WHERE e.household_id = $1
    AND ei.billing_date <= CURRENT_DATE
    AND s.user_id <> e.created_by
  GROUP BY e.created_by, s.user_id;

  SELECT from_user, to_user, SUM(amount_base)
  FROM settlement_payments
  WHERE household_id = $1
  GROUP BY from_user, to_user;

Combinar: para cada par (A, B):
  neto = owed(A→B) - owed(B→A) - settled(A→B) + settled(B→A)
  si neto > 0: A debe neto a B

Response: [{ from, to, amount }] no-cero, en base_currency del household.
```

### Flujo 5: Pagar una deuda

```
Usuario A ve GET /households/:id/balances/me → "Le debo $800 a B".
Toca "Pagar" → modal con monto + nota + fecha.
Submit →

POST /settlements
{
  "household_id": "...",
  "to_user": "B",
  "amount_base": 500,
  "note": "Te transferí",
  "paid_at": "2026-04-18"
}

Service:
  1. from_user = user_id del JWT.
  2. Validar from_user != to_user.
  3. Validar ambos son members del household.
  4. Calcular balance actual del par (misma query que Flujo 4 pero solo ese par).
  5. Rechazar si amount_base > balance_actual (ErrValidation).
  6. INSERT settlement_payment.

Response: 201 { settlement }

La próxima vez que alguien pida /balances, la deuda refleja el pago.
```

### Flujo 6: Crear un objetivo con progreso en vivo

```
POST /goals
{
  "scope": "household",
  "goal_type": "category_limit",
  "category_id": "uuid-comida",
  "target_amount": 80000,
  "currency": "ARS",
  "period": "monthly"
}

GET /goals devuelve (entre otros):
{
  "id": "...",
  "scope": "household",
  "goal_type": "category_limit",
  "category": "Comida",
  "target_amount": 80000,
  "current_amount": 62000,
  "percentage": 77.5,
  "remaining": 18000,
  "days_left_in_month": 14,
  "daily_budget_remaining": 1285.71,
  "status": "on_track",
  "message": "Vas bien. Te quedan $18.000 para 14 días ($1.286/día)."
}

Cálculo del status:
  on_track → pct del mes gastado <= pct del mes transcurrido + 10%
  at_risk  → 80% ≤ percentage < 100%
  critical → falta < 5% para superar
  exceeded → percentage >= 100%
```

### Flujo 7: Worker diario

```
cmd/worker/main.go arranca N goroutines con tickers:

00:30 — Generar recurrentes del día (expenses + incomes).
01:00 — Generar insights diarios:
         - daily_summary del día anterior
         - alerts de goals > 80%
         - tips cada 3 días
         - weekly_review los domingos
Cada 15 min (24/7) — Fetch bluelytics → INSERT IF NEW en exchange_rates.
Día 1 del mes 08:00 — Email con reporte mensual (Resend).

Cada job corre con un context con timeout; los errores se loguean y no frenan los demás.
```

---

## Exchange rate: fetcher + conversión

### Estrategia intraday

El blue se mueve lunes a viernes 9:00–17:00 ART y queda congelado el resto del tiempo. La API bluelytics devuelve `last_update` — el timestamp exacto del último cambio.

- Worker fetchea cada **15 min, 24/7**.
- PK compuesta `(currency, source, last_update)` + `ON CONFLICT DO NOTHING` → si `last_update` no cambió, el INSERT es no-op.
- Fin de semana: 0 filas nuevas por 2 días. Correcto.
- Promedio mensual: ~22 días hábiles × 8 h × 4 fetches/h × 2 monedas ≈ 1.400 filas/mes.

### Rate usado al crear un expense/income

1. Buscar el último rate para esa currency: `ORDER BY last_update DESC LIMIT 1`.
2. Calcular `amount_base` según dirección:
   - `ARS → USD`: `amount / rate_avg`
   - `USD → ARS`: `amount × rate_avg`
   - `ARS → EUR`: `amount / rate_avg_eur`
   - `EUR → ARS`: `amount × rate_avg_eur`
   - `USD ↔ EUR`: dos saltos (futuro; por ahora no soportado).
3. Guardar `amount_base`, `rate_used`, `rate_at` dentro del expense/income.

Después de crear, el valor queda **congelado** en `amount_base`. Los reportes suman `amount_base` y listo.

### Caché in-memory del último rate

El API cachea el último rate por moneda con `sync.RWMutex` + TTL 5 min. El worker, al guardar un rate nuevo, **no** invalida el caché del API (son procesos distintos). Aceptable: 5 min de desfase en una conversión es mínimo, y queda fijado al guardar.

### Fallback si no hay rate

Si al crear un expense en moneda no-base no existe ningún rate en la DB (ej: primer uso antes de que el worker haya corrido nunca), el API devuelve 503 con mensaje claro y el frontend pide al user esperar un minuto. En práctica, como el worker arranca con un fetch inmediato, esto no pasa.

---

## Cálculo de `billing_date` para créditos

Para payment_methods con `kind = 'credit'`:

1. Obtener `default_closing_day` (D_c) y `default_due_day` (D_v) de la `credit_card` asociada.
2. **Primera cuota:**
   - Si `spent_at.day ≤ D_c` → la cuota cierra este mes, vence el mes siguiente (o mismo si D_v > D_c).
   - Si `spent_at.day > D_c` → la cuota cierra el mes siguiente, vence un mes más tarde.
3. **Cuotas 2..N:** `billing_date` y `due_date` se incrementan un mes respecto a la cuota anterior.
4. **Clamp de día:** si un mes no tiene ese día (31 en febrero), usamos el último día del mes.

Para `cash/debit/wallet-sin-cuotas/transfer`: **una sola fila** con `billing_date = due_date = spent_at`.

---

## Balance entre miembros — fórmula completa

Para un household con miembros A, B, C, ..., el balance "A debe a B":

```
  SUM(s.amount_base_owed WHERE e.created_by = B AND s.user_id = A AND ei.billing_date ≤ hoy)
- SUM(s.amount_base_owed WHERE e.created_by = A AND s.user_id = B AND ei.billing_date ≤ hoy)
- SUM(sp.amount_base WHERE sp.from_user = A AND sp.to_user = B)
+ SUM(sp.amount_base WHERE sp.from_user = B AND sp.to_user = A)
```

- `> 0` → A debe ese monto a B.
- `< 0` → B debe `abs()` a A.
- `= 0` → saldado.

`GET /households/:id/balances` arma la matriz completa para todos los pares no-cero.

### Eliminar un expense con settlements relacionados

`DELETE /expenses/:id` hace CASCADE sobre `expense_installments` y `expense_installment_shares`. Los `settlement_payments` **quedan**. El balance se recalcula coherentemente con el nuevo estado.

**Ejemplo:**
1. A compra $1.000 shared 50/50 → cuota única, activa hoy → novia debe $500 a A.
2. Novia crea settlement: pagó $500 a A → balance = 0.
3. A borra el expense → shares desaparecen → `0 - 0 - 0 + 500 = -500` → **A debe $500 a novia**.

Es lo correcto: si el gasto "nunca existió", el pago que novia hizo queda como préstamo. A puede compensarlo con un settlement en sentido contrario, o dejarlo así y saldar fuera del sistema.

---

## Reporte mensual para IA

`GET /reports/ai-export?month=2026-04&format=json|markdown`

### Estructura JSON

```json
{
  "meta": {
    "household_name": "Mi hogar",
    "base_currency": "ARS",
    "month": "2026-04",
    "generated_at": "2026-04-18T04:22:15Z"
  },
  "summary": {
    "total_spent": 485000.00,
    "total_income": 620000.00,
    "savings": 135000.00,
    "total_transactions": 47,
    "avg_per_transaction": 10319.15,
    "avg_per_day": 16166.67,
    "days_with_spending": 28
  },
  "by_category": [
    { "name": "Hogar", "total": 180000, "percentage": 37.1, "count": 5,
      "recurring_amount": 145000, "variable_amount": 35000 },
    { "name": "Comida", "total": 125000, "percentage": 25.8, "count": 22,
      "recurring_amount": 0, "variable_amount": 125000 }
  ],
  "recurring_summary": {
    "total_recurring": 195000,
    "total_variable": 290000,
    "recurring_percentage": 40.2,
    "active_recurring_count": 8,
    "items": [
      { "description": "Alquiler", "amount": 145000, "category": "Hogar" },
      { "description": "Netflix",  "amount":  12000, "category": "Entretenimiento" }
    ]
  },
  "trends": {
    "vs_last_month": { "total_change_percent": 12.3, "direction": "up" },
    "last_6_months": [
      { "month": "2025-11", "total": 320000 },
      { "month": "2026-04", "total": 485000 }
    ]
  },
  "daily_pattern": {
    "highest_day": { "date": "2026-04-01", "total": 165000 },
    "lowest_day":  { "date": "2026-04-14", "total": 1200 },
    "by_weekday": { "monday": 78000, "saturday": 95000 }
  },
  "top_expenses": [
    { "description": "Alquiler", "amount": 145000, "date": "2026-04-01", "category": "Hogar" }
  ],
  "all_expenses": [
    { "date": "2026-04-01", "description": "Alquiler (recurrente)", "amount": 145000, "category": "Hogar" }
  ],
  "household_context": {
    "members": ["Luciano", "Novia"],
    "split_weights": { "Luciano": 0.5, "Novia": 0.5 },
    "balances": [{ "from": "Luciano", "to": "Novia", "amount": 12500 }]
  }
}
```

### Formato Markdown

Devuelve el mismo contenido como texto plano listo para pegar en Claude/ChatGPT:

```markdown
# Reporte financiero — Abril 2026

## Resumen
- Total gastado: $485.000 ARS
- Total ingresos: $620.000 ARS
- Ahorro: $135.000 ARS (21.8%)
- Transacciones: 47
- Promedio diario: $16.167
- Gastos recurrentes: $195.000 (40.2%)
- Gastos variables: $290.000 (59.8%)

## Por categoría
| Categoría | Total | % | Recurrente | Variable |
|---|---|---|---|---|
| Hogar  | $180.000 | 37.1% | $145.000 | $35.000  |
| Comida | $125.000 | 25.8% | $0       | $125.000 |

## Tendencia últimos 6 meses
Nov 2025: $320.000
Dic 2025: $380.000
…
Abr 2026: $485.000

## Top 10 gastos del mes
1. Alquiler — $145.000 (01/04) — Hogar
2. Supermercado — $32.000 (08/04) — Comida

---
Analizá estos datos y dame:
1. Patrones de gasto preocupantes
2. Oportunidades de ahorro concretas
3. Comparación con meses anteriores
4. Predicción del gasto del próximo mes
```

### Email mensual

El Worker manda un email el día 1 del mes a las 08:00 con Resend:

- HTML con el resumen (total, top categorías, ahorro, balances del hogar).
- Link a `/reports/ai-export?month=...&format=markdown` en la PWA para copiar/pegar en una IA.
- Call to action: "Revisá el mes y ajustá tus objetivos".

---

## Insights diarios — lógica determinística

Worker 01:00 AM:

```go
func (s *InsightService) GenerateForHousehold(ctx, householdID) {
    today := time.Now()
    yesterday := today.AddDate(0, 0, -1)

    // 1. daily_summary del día anterior
    expenses := s.expenseRepo.ListByDate(ctx, householdID, yesterday)
    if len(expenses) > 0 {
        s.insightRepo.Upsert(ctx, buildDailySummary(householdID, yesterday, expenses))
    }

    // 2. alerts por objetivos en riesgo
    goals := s.goalRepo.ListActiveWithProgress(ctx, householdID)
    for _, g := range goals {
        if g.Percentage >= 80 && g.Status != "exceeded" {
            s.insightRepo.Upsert(ctx, buildGoalAlert(g))
        }
    }

    // 3. tips cada 3 días
    if today.Day() % 3 == 0 {
        patterns := s.analyzePatterns(ctx, householdID)
        if tip := buildPatternTip(patterns); tip != nil {
            s.insightRepo.Upsert(ctx, tip)
        }
    }

    // 4. weekly_review los domingos
    if today.Weekday() == time.Sunday {
        s.insightRepo.Upsert(ctx, buildWeeklyReview(ctx, householdID))
    }
}
```

El UNIQUE `(household_id, user_id, insight_date, insight_type)` garantiza que si el worker corre dos veces en el mismo día, no duplica.

---

## Auth — refresh rotativo sin tabla

```
Login:
  Go responde:
    - access  (JWT 15 min, firmado con JWT_SECRET)          → body JSON
    - refresh (JWT 7 días, firmado con JWT_SECRET_REFRESH)  → Set-Cookie httpOnly Secure SameSite=Strict

Cada request:
  Authorization: Bearer <access>

Cuando access expira (401):
  POST /auth/refresh
    - Browser manda cookie automáticamente
    - Go valida refresh (firma + exp)
    - Go emite NUEVO access + NUEVO refresh (el anterior queda huérfano, muere en su exp)
    - Set-Cookie sobrescribe refresh

Logout:
  POST /auth/logout → Set-Cookie refresh Max-Age=0
```

**Por qué sin tabla:** para 2-5 usuarios no necesitamos logout remoto ni detección de robo. Cuando haga falta (más usuarios, o feature "cerrar sesión en todos los dispositivos"), se agrega tabla `refresh_tokens` con `(id, user_id, issued_at, expires_at, revoked_at)`.

---

## Rate limiting

Middleware in-memory con `golang.org/x/time/rate`:

```go
// Pseudo:
// mapa IP → *rate.Limiter
// GC cada 5 min de clientes con lastSeen > 10 min

r.With(mw.RateLimit(0.1, 5)).Post("/auth/login", ...)   // ~6 req/min con burst 5
r.With(mw.RateLimit(0.1, 5)).Post("/auth/register", ...)
r.Use(mw.RateLimit(2, 20))                              // global: 2 rps, burst 20
```

IP se toma de `X-Forwarded-For` (está detrás de Coolify que hace reverse proxy); si está vacío, de `r.RemoteAddr`.

---

## CORS

```go
r.Use(mw.CORS(cfg.AllowedOrigins))
// cfg.AllowedOrigins = ["http://localhost:3000", "https://ahorra.tudominio.com"]

// Headers permitidos: Authorization, Content-Type, X-Household-ID
// Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
// Credentials: true (necesario por la cookie de refresh)
// Nunca "*" con credentials → el browser rechaza.
```

---

## Worker — orquestación

`cmd/worker/main.go` arranca como un proceso independiente que comparte DB con el API. Lanza N goroutines cada una con su ticker:

```
┌───────────────────────────────────────────────────┐
│ Goroutine 1: rate fetcher                         │
│   ticker cada 15 min                              │
│   FetchAndStore() — GET bluelytics + INSERT IF NEW│
├───────────────────────────────────────────────────┤
│ Goroutine 2: recurring generator                  │
│   cron diario 00:30                               │
│   Para cada recurring_expense/income activo:      │
│     - chequear last_generated < período actual    │
│     - crear fila real con spent_at/received_at    │
│     - actualizar last_generated                   │
│     - si ends_at vencido → is_active=false        │
├───────────────────────────────────────────────────┤
│ Goroutine 3: insights                             │
│   cron diario 01:00                               │
│   Para cada household:                            │
│     - daily_summary, alerts, tips, weekly_review  │
├───────────────────────────────────────────────────┤
│ Goroutine 4: email mensual                        │
│   cron día 1 del mes 08:00                        │
│   Para cada household:                            │
│     - Genera reporte Markdown                     │
│     - Envía email con Resend                      │
└───────────────────────────────────────────────────┘
```

- Todas las goroutines escuchan `ctx.Done()` para graceful shutdown.
- Con **1 instancia** del worker, no hace falta lock distribuido. Si algún día se escala a 2+, se cambia el SELECT del recurring_generator a `FOR UPDATE SKIP LOCKED` — nota bajo.

### Lock distribuido (referencia para el futuro)

```sql
SELECT * FROM recurring_expenses
WHERE is_active
  AND (last_generated IS NULL OR last_generated < $1)
FOR UPDATE SKIP LOCKED;
```

Instancia A procesa mitad, B procesa otra mitad, sin overlap.

---

## PWA — manifest + service worker

### Manifest

```typescript
// app/manifest.ts
import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Ahorra',
    short_name: 'Ahorra',
    description: 'Gestión de gastos personal y multi-hogar',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#2E75B6',
    orientation: 'portrait',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  }
}
```

### Service worker básico (network-first, fallback cache)

```javascript
const CACHE_NAME = 'ahorra-v1'
const PRECACHE = ['/', '/expenses', '/reports']

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(PRECACHE)))
})

self.addEventListener('fetch', (e) => {
  e.respondWith(
    fetch(e.request)
      .then(r => { const c = r.clone(); caches.open(CACHE_NAME).then(ca => ca.put(e.request, c)); return r })
      .catch(() => caches.match(e.request))
  )
})
```

---

## Tipos compartidos del frontend

```typescript
// types/index.ts

export type Currency = 'ARS' | 'USD' | 'EUR'
export type PaymentKind = 'cash' | 'debit' | 'credit' | 'wallet' | 'transfer'

export interface User { id: string; name: string; email: string }

export interface Household {
  id: string
  name: string
  base_currency: Currency
  role: 'owner' | 'member'
}

export interface Category { id: string; name: string; icon: string; color: string }

export interface Bank { id: string; name: string; is_active: boolean }

export interface PaymentMethod {
  id: string
  bank_id: string | null
  name: string
  kind: PaymentKind
  allows_installments: boolean
  is_active: boolean
  credit_card?: CreditCard
}

export interface CreditCard {
  id: string
  alias: string
  last_four: string | null
  default_closing_day: number
  default_due_day: number
  debit_payment_method_id: string | null
}

export interface Expense {
  id: string
  category_id: string | null
  payment_method_id: string
  amount: number
  currency: Currency
  amount_base: number
  base_currency: Currency
  rate_used: number | null
  rate_at: string | null
  description: string
  spent_at: string
  installments: number
  is_shared: boolean
  created_by: string
  created_at: string
  installments_detail?: Installment[]
}

export interface Installment {
  id: string
  installment_number: number
  installment_amount: number
  installment_amount_base: number
  billing_date: string
  due_date: string | null
  is_paid: boolean
  shares?: Share[]
}

export interface Share { user_id: string; amount_base_owed: number }

export interface Income {
  id: string
  received_by: string
  amount: number
  currency: Currency
  amount_base: number
  source: string
  description: string
  received_at: string
}

export interface Settlement {
  id: string
  from_user: string
  to_user: string
  amount_base: number
  base_currency: Currency
  note: string | null
  paid_at: string
}

export interface Goal {
  id: string
  scope: 'household' | 'user'
  user_id: string | null
  category_id: string | null
  goal_type: 'category_limit' | 'total_limit' | 'savings'
  target_amount: number
  currency: Currency
  period: 'monthly' | 'weekly'
  current_amount: number
  percentage: number
  remaining: number
  status: 'on_track' | 'at_risk' | 'critical' | 'exceeded'
  message: string
}

export interface Balance { from: string; to: string; amount: number }

export interface Insight {
  id: string
  insight_type: string
  severity: 'info' | 'warning' | 'critical'
  title: string
  body: string
  insight_date: string
  is_read: boolean
}
```

---

## Deploy en Coolify

### Servicios

| Servicio | Tipo | Puerto | Dominio |
|---|---|---|---|
| Postgres dev | Database (supabase/postgres:17.4.1.032) | 5432 interno | — |
| Postgres prod | Database (supabase/postgres:17.4.1.032) | 5432 interno | — |
| Go API (dev + prod) | Application (Dockerfile, target `api`) | 8080 | `api.ahorra.tudominio.com` (prod) + `api-dev.ahorra.tudominio.com` |
| Go Worker (dev + prod) | Application (Dockerfile, target `worker`) | — | — |
| Next.js PWA (dev + prod) | Application (Nixpacks) | 3000 | `ahorra.tudominio.com` + `dev.ahorra.tudominio.com` |

Dev y prod son instancias separadas. Dev apunta a una Postgres de dev con datos de prueba, prod apunta a Postgres de prod.

### Variables de entorno

**Go API:**
```
DATABASE_URL=postgresql://ahorra:password@postgres-ahorra:5432/ahorra?sslmode=disable
JWT_SECRET=<64 chars aleatorios>
JWT_SECRET_REFRESH=<64 chars aleatorios, DISTINTO del anterior>
PORT=8080
ALLOWED_ORIGINS=https://ahorra.tudominio.com
LOG_LEVEL=info
```

**Go Worker:**
```
DATABASE_URL=postgresql://ahorra:password@postgres-ahorra:5432/ahorra?sslmode=disable
RESEND_API_KEY=re_xxxxxxxxxxxx
EMAIL_FROM=ahorra@tudominio.com
LOG_LEVEL=info
```

**Next.js PWA:**
```
NEXT_PUBLIC_API_URL=https://api.ahorra.tudominio.com
```

### Dockerfile multi-stage (mismo binario sirve API y Worker)

```dockerfile
# Build
FROM golang:1.25-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .

RUN CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build \
    -ldflags='-s -w' -o /api ./cmd/api
RUN CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build \
    -ldflags='-s -w' -o /worker ./cmd/worker

# Runtime API
FROM gcr.io/distroless/static-debian12:nonroot AS api
COPY --from=builder /api /api
USER nonroot:nonroot
EXPOSE 8080
ENTRYPOINT ["/api"]

# Runtime Worker
FROM gcr.io/distroless/static-debian12:nonroot AS worker
COPY --from=builder /worker /worker
USER nonroot:nonroot
ENTRYPOINT ["/worker"]
```

En Coolify: para la API, build target `api`. Para el worker, build target `worker`.

### docker-compose local (solo DB)

```yaml
services:
  postgres:
    image: supabase/postgres:17.4.1.032
    container_name: ahorra-postgres
    restart: unless-stopped
    environment:
      POSTGRES_PASSWORD: supersecret
    ports:
      - "5433:5432"          # 5432 en Windows lo ocupa Postgres nativo
    volumes:
      - ahorra_pg_data:/var/lib/postgresql/data
      - ./docker/initdb:/docker-entrypoint-initdb.d

volumes:
  ahorra_pg_data:
```

`docker/initdb/001_create_role_db.sql`:

```sql
CREATE ROLE ahorra WITH LOGIN PASSWORD 'ahorra';
CREATE DATABASE ahorra OWNER ahorra;
GRANT ALL PRIVILEGES ON DATABASE ahorra TO ahorra;
```

`.env.example`:

```
DATABASE_URL=postgresql://ahorra:ahorra@localhost:5433/ahorra?sslmode=disable
JWT_SECRET=cambiame-por-algo-de-64-caracteres-o-mas-asi-valida-la-config
JWT_SECRET_REFRESH=cambiame-tambien-por-algo-distinto-de-64-caracteres-minimo
PORT=8080
ALLOWED_ORIGINS=http://localhost:3000
LOG_LEVEL=debug
```

---

## Roadmap de checkpoints (slices verticales)

> **Filosofía.** Nada de "semana 1: toda la DB, semana 2: todos los endpoints". Cada checkpoint es una **feature completa punta a punta**: migración → queries sqlc → domain → repo → service → handler → endpoint funcionando (con curl). Cuando un checkpoint cierra, esa feature es usable. Si el proyecto se pausa, lo que está hecho queda funcional.

### Checkpoint 0 — Setup ✅ HECHO

- ✅ `go mod init`, repo + push GitHub
- ✅ docker-compose con `supabase/postgres:17.4.1.032` en puerto 5433
- ✅ `docker/initdb` crea rol `ahorra` + DB `ahorra`
- ✅ `.env` + `.env.example` + `.gitignore`
- ✅ `internal/config/env.go` (parser propio)
- ✅ `internal/db/pool.go` (pgxpool)
- ✅ `cmd/api/main.go` con `slog` + `SELECT 1` smoke test
- ✅ `sqlc.yaml` con pgx/v5, emit_interface, UUID → google/uuid

### Checkpoint 1 — Core multi-tenant ✅ parcialmente

- ✅ Migración `000001_init_core` (users, households, household_members)
- ✅ Queries sqlc de users y households (`IsHouseholdMember`, `sqlc.embed`)
- ✅ Domain: `User`, `Household`, `HouseholdMember`, errores centinela (`ErrNotFound`, `ErrConflict`, etc.)
- ✅ `internal/httpx` (json helpers, logger, recovery, cors, ratelimit)
- ✅ Chi router con middlewares base + `/health/live` + `/health/ready`
- ✅ Graceful shutdown en `cmd/api/main.go`

**Entregable:** el API arranca, tiene health checks, Postgres responde, estructura base lista.

### Checkpoint 2 — Auth completo

- ✅ `internal/auth/jwt.go` (sign + verify access + refresh)
- ✅ `internal/auth/password.go` (bcrypt)
- ✅ `internal/auth/service.go` — Register transaccional (user + Efectivo placeholder + Mi hogar + split_rule + categorías default **tras** los checkpoints 3 y 4; por ahora sin Efectivo ni categorías, se agrega al tener esas tablas)
- ✅ Login / Refresh rotativo / Logout
- ✅ Middleware de auth (JWT → user_id en ctx)
- ✅ Middleware de household (X-Household-ID → valida membership → household_id en ctx)
- ✅ Rate limit en `/auth/*`
- ✅ Endpoints: `/auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/me`
- ✅ Endpoints households: list, create, invite, members
- ⏩ **Split rules movidos a CP7** (la tabla `household_split_rules` se crea en la migración `000006_settlements`; hacer el endpoint ahora implicaría trabajo duplicado). Logout queda stateless (solo limpia cookie); revocation real con tabla `refresh_tokens` se evalúa cerca de CP17.

**Entregable:** curl completo de dos usuarios: A se registra, crea hogar, invita a B, B se registra y acepta. (Edición de split 60/40 se prueba en CP7.)

### Checkpoint 3 — Payment methods ✅ HECHO

- ✅ Migración `000002_payment_methods` (banks, payment_methods, credit_cards)
- ✅ Migración extra `000003_users_split_name` (name → first_name + last_name)
- ✅ Queries sqlc
- ✅ Domain + repo + service + handlers
- ✅ Endpoints `/banks/*`, `/payment-methods/*`, `/payment-methods/:id/credit-card`
- ✅ Validación de `allows_installments` por `kind` (CHECK en DB + guard en service)
- ✅ **Register crea `Efectivo` automáticamente** vía `registerBootstrap` hook (no transaccional: si falla, se loguea y sigue)

**Entregable:** crear bancos, agregar tarjeta Visa con closing_day y due_day, desactivar efectivo y reactivar.

### Checkpoint 4 — Categories ✅ HECHO

- ✅ Migración `000004_categories` (renumerada: 000003 fue usada para `users_split_name`)
- ✅ Queries sqlc + domain `Category` + `DefaultCategories` seed
- ✅ Repository (incluye `SeedDefaultsTx` para bootstrap transaccional)
- ✅ Service (CRUD + validación de hogar)
- ✅ Handler + rutas `/categories` (GET/POST/PATCH/DELETE) bajo `RequireHouseholdMember`
- ✅ **Hook en `households.Service.Create`**: al crear un hogar se siembran las 7 categorías default (Comida, Hogar, Transporte, Entretenimiento, Servicios, Salud, Otros) dentro de la misma transacción — decisión B: el bootstrap vive en el endpoint de household, no en register, para que valga para cualquier hogar nuevo (incluido el segundo de un user existente).

**Entregable:** CRUD de categorías, crear un hogar ya inserta las 7 default de forma atómica.

### Checkpoint 5 — Exchange rates (infra lista antes de expenses) ✅ HECHO

- ✅ Migración `000005_exchange_rates` (renumerada: en el plan original era 000008, acá sigue el orden real del FS)
- ✅ Queries sqlc + domain `ExchangeRate`
- ✅ Repository con `Upsert` (`ON CONFLICT DO NOTHING`), `GetLatest`, `ListLatest`
- ✅ Fetcher HTTP a `api.bluelytics.com.ar/v2/latest` (USD + EUR, blue + oficial)
- ✅ Caché in-memory con `sync.RWMutex`, hidratado desde DB al arrancar
- ✅ Service con `Current()`, `Refresh()`, `Convert(amount, from, to)` — conversión vía ARS
- ✅ Worker en goroutine del mismo binario (no `cmd/worker/main.go` separado; decisión de mantener un solo proceso para el MVP). Fetch inmediato al arrancar + tick cada 15min. Graceful shutdown via context cancel.
- ✅ Endpoint `GET /exchange-rates/current` (bajo `RequireAuth`)
- ⏳ `/exchange-rates/convert` y `/exchange-rates/history` diferidos hasta que expenses los necesite

**Entregable:** worker corriendo dentro del API, tabla `exchange_rates` con datos reales, caché funcionando, `fxrates.Service.Convert` listo para que CP6 (expenses) lo use.

### Checkpoint 6 — Expenses con cuotas (core del producto) ✅ HECHO

- ✅ Migración `000006_expenses` (expenses + expense_installments + expense_installment_shares; recurring_expenses queda para CP9)
- ✅ Migración `000007_credit_card_periods` (override mensual de closing/due date por tarjeta)
- ✅ Queries sqlc: `expenses.sql`, `credit_card_periods.sql`
- ✅ Domain: `Expense`, `ExpenseInstallment`, `InstallmentShare`, `ExpenseDetail`, `CreditCardPeriod`
- ✅ Paquete `creditperiods` (repo + service + handler) + rutas `/payment-methods/{id}/credit-card/periods/*` (list, status, PUT /{ym}, DELETE /{ym})
- ✅ `POST /payment-methods` (kind=credit) extendido: acepta `currentPeriod`/`nextPeriod` inline → pm + credit_card + periodos en **una sola transacción**
- ✅ Paquete `expenses` (repo + service + handler)
  - Creación transaccional: expense + installments + shares con `pgx.BeginFunc`
  - Resolución de `billing_date`/`due_date` por cuota: fallback tabla `credit_card_periods` → defaults `default_closing_day`/`default_due_day` con clamp por fin de mes
  - Conversión multi-moneda denormalizada (`amount_base`, `rate_used`, `rate_at`) vía `fxrates.Service`
  - Split equitativo de shares entre miembros del hogar si `is_shared=true` (weighted real queda para CP7); última cuota/share absorbe residuo por redondeo
  - Forzado de `installments=1` si el método no permite cuotas
- ✅ Endpoints `/expenses`: POST, GET (list con filtros categoryId/paymentMethodId/from/to/limit/offset), GET /{id}, PATCH /{id} (solo meta: description, categoryId), DELETE /{id}
- ✅ Endpoint `PATCH /expenses/{id}/installments/{n}` — editar `billingDate`, `dueDate` (con `null` explícito para limpiar vía `json.RawMessage`), marcar/desmarcar `isPaid`
- ✅ Postman extendido con folders **Credit card periods** + **Expenses**
- ⏳ Tests unitarios del generador de installments y del generador de shares (diferidos; se agregan cuando sumemos suite de tests)
- ⏩ `view=billed` y regeneración de hijos en Update: diferidos a CP7 (requiere split_rules + settlements para cerrar el flujo de deudas)

**Entregable:** `POST /expenses` con tarjeta de crédito de 6 cuotas compartidas crea expense + 6 installments + N*6 shares en una transacción, con fechas resueltas contra `credit_card_periods`. `PATCH /expenses/{id}/installments/1` permite ajustar fechas o marcar pagado sin regenerar el resto.

### Checkpoint 7 — Settlements + split_rules + balances ✅ HECHO

- ✅ Migración `000008_settlements` (household_split_rules + settlement_payments)
- ✅ Queries sqlc (incluye el query agregado de balances usando `expense_installments.billing_date <= CURRENT_DATE`; los billing_date/due_date ya están denormalizados desde CP6 contra `credit_card_periods`)
- ✅ Paquete `splitrules` (repo + service) + bootstrap hook en `households.Service.Create` (weight=1.0 al owner) y `AddMember` (weight=1.0 al invitado) dentro de la misma tx que categorías (`AfterMemberHook`)
- ✅ **Refactor** `expenses.Service.buildShares`: reemplazado el split equitativo por weighted normalizado desde `household_split_rules` + soporte de `sharesOverride` en POST /expenses (array `{userId, amount}` que reemplaza el default). Último user absorbe residuo de redondeo; orden determinístico por UUID.
- ✅ Service de settlements con validación `amount ≤ deuda del par` (+0.01 tolerancia) usando `balances.PairNet`
- ✅ Service de balances on-demand (`HouseholdNet` canonicalizado + `MyView` + `PairNet`)
- ✅ Endpoints `/balances`, `/balances/me`, `/settlements` (GET list, POST, GET by id, DELETE)
- ✅ Endpoints `/split` (GET, PATCH) — solo owner puede editar; **diferido desde CP2** completado

**Entregable:** A compra $12.000 shared 60/40 en 12 cuotas; al principio balance = 0; al llegar el billing_date de la cuota 1 (resuelto desde `credit_card_periods`), novia debe $400; novia paga $400, balance vuelve a 0.

### Checkpoint 8 — Incomes ✅ HECHO

- ✅ Migración `000009_incomes` (incomes + recurring_incomes con índices + CHECKs de source/frequency)
- ✅ Queries sqlc + domain (Income, RecurringIncome) + repo (CRUD + SumBaseInRange + recurring con `last_generated`)
- ✅ Service con FX contra `households.base_currency` (congela rate/rateAt igual que expenses) + validación `receivedBy` miembro del hogar
- ✅ Handlers CRUD `/incomes` + `/recurring-incomes` + `PATCH /recurring-incomes/:id/active` + `GET /totals/income?from=&to=`
- ✅ Worker diario 00:30 (`incomes.Worker`) — idempotente via `last_generated` + catch-up al arrancar; `clampDay` para "monthly el 31" en meses cortos
- ✅ Postman: carpetas Incomes, Recurring incomes, Totals con variables `incomeId`/`recurringIncomeId`

**Entregable:** registrar un sueldo recurrente, el día configurado se genera un income real, `/totals/income` lo suma.

### Checkpoint 9 — Recurring expenses generation ✅ HECHO

- ✅ Migración `000010_recurring_expenses` con índices por household/active (partial) y household/created_at
- ✅ Queries sqlc + `domain.RecurringExpense` + `internal/recurringexpenses` (repo/service/handler)
- ✅ CRUD completo `/recurring-expenses` + `PATCH /recurring-expenses/:id/active`
- ✅ Worker 00:30 (`recurringexpenses.Worker`) — delega en `expenses.Service.Create` para reusar cuotas / shares / FX / credit_card_periods sin duplicar lógica. Idempotente via `last_generated`, catch-up al arrancar, `clampDay` para "monthly el 31" en meses cortos
- ✅ Resiliente: si una plantilla falla al crear expense (ej. payment_method borrado), se loguea y sigue — no frena las demás. El endpoint `/payment-methods/:id/credit-card/periods/status` ya existía desde CP6 para avisar de periodos faltantes
- ✅ Postman: carpeta Recurring expenses con `recurringExpenseId`

**Entregable:** un recurring_expense activo genera su expense real al día siguiente 00:30, incluyendo gastos en cuotas de tarjeta con fechas correctamente resueltas.

### Checkpoint 10 — Goals ✅ HECHO

- ✅ Migración `000011_goals` (`budget_goals` + `daily_insights` juntos; CP10 y CP11 comparten migración)
- ✅ Service con cálculo de progreso en vivo (category_limit, total_limit, savings; scopes household + user)
- ✅ **Criterio de corte mensual**: `category_limit`/`total_limit` suman `expense_installments` usando `COALESCE(due_date, billing_date)` dentro del período (crédito cuenta al vencer, el resto al ejecutarse). `savings` = `SUM(incomes.received_at en período) - SUM(installments COALESCE(due_date,billing_date) en período)`.
- ✅ Endpoints `/goals/*` (CRUD + `/progress` individual y lista)
- ✅ Postman: carpeta Goals con `goalId`

**Entregable:** crear un goal `category_limit` en Comida $80.000, `GET /goals` muestra `current_amount` sumando solo las cuotas que vencen este mes, `percentage`, `status`, `message`.

### Checkpoint 11 — Insights ✅ HECHO

- ✅ (Tabla `daily_insights` ya creada en la migración de CP10)
- ✅ Service con lógica determinística — los insights aprovechan la triada:
  - `daily_summary` — "Ayer gastaste X en Z categorías" (por `spent_at`) + "Este mes te vienen a cobrar Y" (por COALESCE(due_date, billing_date))
  - `alert` — goal `category_limit`/`total_limit` con >=80% usado (warning) o >=100% (critical); savings con <50% después del día 20 del mes
  - `weekly_review` — domingos, semana vs anterior (severity warning si subió >20%)
  - (`tip` pendiente — se puede agregar más adelante con más datos históricos)
- ✅ Worker: goroutine de insights 01:00 con catch-up al arrancar
- ✅ Endpoints `/insights/*` (list con filtros + unread-count + mark-read/all + delete + generate manual)
- ✅ Postman: carpeta Insights con `insightId`

**Entregable:** al día siguiente el dashboard muestra insights generados automáticamente, distinguiendo gasto realizado vs gasto facturado.

### Checkpoint 12 — Reports + AI export ✅ HECHO

- ✅ Migración `000012_expenses_recurring_link` (`expenses.recurring_expense_id` FK opcional a `recurring_expenses` con ON DELETE SET NULL)
- ✅ Service de reports (monthly + trends + ai-export con prompt pre-armado)
- ✅ **Triada de totales del mes** (killer feature de `credit_card_periods`):
  - `spent_this_month` — `expenses.spent_at` en el mes (cuándo se hizo la compra)
  - `billed_this_month` — `installments.billing_date` en el mes (cuándo cerró el resumen de tarjeta)
  - `due_this_month` — `installments.due_date` en el mes — COALESCE(due_date, billing_date) para unificar cuotas y no-crédito
  - El AI export incluye las tres para que el LLM entienda la diferencia entre "gasté" y "me cobran"
- ✅ Separación fijos (recurring_expense_id NOT NULL) vs variables, con counts y %
- ✅ Endpoints `/reports/monthly`, `/reports/trends`, `/reports/ai-export`
- ✅ Template HTML del email mensual (inline CSS para compatibilidad Gmail/Outlook)
- ✅ Cliente Resend puro (sin SDK) + Worker día 1 mes 08:00 con `ListAllHouseholdIDs`
- ✅ Config: `RESEND_API_KEY` y `REPORT_FROM_EMAIL` opcionales (si falta API key, worker loguea y sigue)
- ✅ Postman: carpeta Reports (monthly, monthly by month, trends, ai-export)

**Entregable:** `/reports/ai-export?month=YYYY-MM` devuelve JSON con la triada spent/billed/due + fijos vs variables + top categorías + trends 6m + prompt pre-armado para pegar en Claude. El día 1 del mes llega el email con el resumen del mes anterior si `RESEND_API_KEY` está configurada.

### Checkpoint 13 — Frontend PWA base

- ✅ `create-next-app` con App Router + TypeScript + shadcn/ui
- ✅ `lib/api.ts`: fetch wrapper con `credentials: "include"`, base URL desde `NEXT_PUBLIC_API_URL`, tipos alineados con `API_REFERENCE.md`, SWR para lecturas + Server Actions para mutaciones
- ✅ Access token en memoria (Zustand). Refresh automático en 401 llamando a `POST /auth/refresh` (la cookie `ahorra_refresh` viaja sola; nunca se lee desde JS)
- ✅ Map de errores por `code` (`validation` / `unauthorized` / `forbidden` / `not_found` / `conflict`) — jamás parsear `message`. Los 422 exponen `field` para highlight del input
- ✅ Login / register / logout (logout stateless: solo limpia cookie server-side)
- ✅ Layout con household switcher (inyecta `X-Household-ID` global en toda request household-scoped) + bottom nav
- ✅ Dashboard: monthly spent/billed/due (`GET /reports/monthly`) + goals activos + últimos insights (daily + weekly)
- ✅ `manifest.ts` + service worker básico + icons
- ✅ Dev local: si el refresh cookie no se setea en `http://localhost:3000`, usar `next dev --experimental-https` (cookie prod es `Secure=true` + `SameSite=None` → requiere HTTPS cross-origin)

**Entregable:** PWA instalable con login funcionando contra el Go API desplegado o local.

### Checkpoint 14 — Frontend: gastos e ingresos

- ✅ CRUD expenses con form rico: cuotas, `is_shared`, override de shares, preview de `billing_date` (respeta `credit_periods` overrides por tarjeta y mes), currency picker con preview de `amount_base` + `rateUsed`
- ✅ Lista con filtros: mes, `spent` vs `billed`, tipo (fijo/variable), payment_method; paginación offset/limit + `totalCount`
- ✅ Detalle: installments + shares. `PATCH /expenses/{id}/installments/{n}` con tri-state de `paidAt` (set / clear / keep) vía `json.RawMessage` — el cliente debe omitir el campo para "keep", `null` para "clear"
- ✅ CRUD de incomes + recurring_incomes
- ✅ CRUD de recurring_expenses (templates que el worker genera diario 00:30)
- ✅ Indicador visual "fijo vs variable" usando `recurring_expense_id` del expense (set → generado por worker)

### Checkpoint 15 — Frontend: deudas y goals

- ✅ Página de deudas del hogar: matriz A↔B + mi balance neto (`GET /balances`)
- ✅ Modal "pagar deuda" con validación client-side (`amount ≤ deuda actual`)
- ✅ Historial de settlements
- ✅ Página de goals (`category_limit` / `total_limit` / `savings`) con progreso en vivo calculado por backend
- ✅ Split rules: UI para editar pesos del hogar (`GET` / `PUT /split-rules`)

### Checkpoint 16 — Frontend: configuración + reportes

- ✅ Config bancos / payment_methods (scope user — no usa `X-Household-ID`)
- ✅ Config `credit_periods`: override de `closing_day` / `due_day` por tarjeta y mes puntual
- ✅ Config del hogar: editar, invitar miembros, ver listado. Botón "borrar hogar" solo visible si `role === "owner"` (backend devuelve 403 para otros roles)
- ✅ Config de categorías (por hogar)
- ✅ Página de reportes: monthly (`GET /reports/monthly`) + trends N-meses (`GET /reports/trends?months=6`) con gráficos (recharts). Breakdown por categoría con `pct` + fixed/variable split del backend
- ✅ Página AI export: copiar el `prompt` pre-formateado que devuelve `GET /reports/ai-export?month=YYYY-MM` (string listo para pegar en Claude/GPT)

### Checkpoint 17 — Notificaciones push (Web Push / VAPID)

Enganche de Web Push nativo con VAPID (sin FCM/Firebase). El backend ya está listo; falta el Service Worker y el flujo de suscripción en el frontend.

**Backend ✅ HECHO**

- ✅ Migración `000013_push_subscriptions` (tabla `push_subscriptions` con `endpoint UNIQUE`, keys `p256dh`/`auth`, `user_agent`, `last_seen_at`; FK a `users` con `ON DELETE CASCADE`)
- ✅ Paquete `internal/push/` con:
  - `Repository` (raw pgx): `Upsert` por endpoint, `ListByUser`, `DeleteByEndpoint`, `DeleteByEndpointRaw` (usado en limpieza de 404/410), `Touch`
  - `Service.NotifyUsers(ctx, userIDs, Payload)` fire-and-forget: lanza goroutine detachada del request ctx, firma con VAPID y envía con `SherClockHolmes/webpush-go`. Limpia subs muertas ante `404 Gone` / `410 Gone`. Nil-safe: si no hay VAPID configurado, loguea debug y hace no-op
  - `Handler` montando `GET /push/vapid-public-key` (público), `POST /push/subscriptions` (auth), `DELETE /push/subscriptions` (auth)
- ✅ `cmd/vapidgen/main.go` — CLI que genera `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` (P-256) listas para pegar en Coolify. Correr **una sola vez por ambiente** (regenerar invalida todas las subs existentes)
- ✅ Config con 3 env vars VAPID (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`) — **todas opcionales**. Sin ellas los endpoints `/push/*` siguen funcionando (aceptan subs) pero `NotifyUsers` es no-op silencioso. Útil para dev
- ✅ **Triggers cableados** vía `SetNotifier` (interfaces locales en cada service para no acoplar a `push`, adapter en `cmd/api/main.go`):
  - `expenses.Service.Create` — cuando `IsShared=true`, notifica a cada miembro != `createdBy` con el monto que le toca (`AmountBaseOwed` sumado across installments). Mensaje: *"{creator} cargó '{description}' — te toca $X {baseCurrency}"*. Deep-link `/expenses/{id}`
  - `settlements.Service.Create` — notifica al `ToUser` que `FromUser` registró un pago. Deep-link `/balances`
  - `households.Service.InviteByEmail` — notifica al invitado con el nombre del hogar. Deep-link `/households/{id}`

**Frontend ✅ pendiente** (CP17 se completa acá, antes del deploy final)

- ✅ `NEXT_PUBLIC_VAPID_PUBLIC_KEY` en `.env.local` y Coolify del front (misma clave pública que el backend)
- ✅ `public/sw.js` (Service Worker) con handlers:
  - `push` → `self.registration.showNotification(title, { body, icon, tag, data: { url } })`
  - `notificationclick` → `clients.openWindow(event.notification.data.url)` (deep-link al gasto/balance/hogar)
- ✅ Registrar SW + pedir permiso (`Notification.requestPermission()`) al ingresar al dashboard por primera vez (no al login, es invasivo). Si ya fue concedido, suscribir silenciosamente
- ✅ Fetch `GET /push/vapid-public-key` → si `enabled=false`, no mostrar el prompt de permisos. Suscribir con `registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: <pub key> })`
- ✅ Enviar la subscription al backend (`POST /push/subscriptions` con `{ endpoint, keys: { p256dh, auth } }`). Guardar el `endpoint` en localStorage para el unsubscribe
- ✅ Logout: `registration.pushManager.getSubscription().unsubscribe()` + `DELETE /push/subscriptions` con el endpoint
- ✅ Safari/iOS: documentar que requiere PWA instalada ("Añadir a pantalla de inicio") desde iOS 16.4 — mostrar tip en la UI si detectamos Safari sin `standalone: true`

**Coolify — qué cargar** (antes de deployar el backend a prod)

1. Correr `go run ./cmd/vapidgen` **una sola vez** (local)
2. Pegar en Environment Variables del servicio API:
   - `VAPID_PUBLIC_KEY=<generada>`
   - `VAPID_PRIVATE_KEY=<generada>`
   - `VAPID_SUBJECT=mailto:luciano.rodriguez.dev@gmail.com`
3. Pegar la misma `VAPID_PUBLIC_KEY` en el servicio Next.js como `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
4. Aplicar migración `000013` contra la DB prod (mismo comando `migrate` que el resto)

**Entregable:** al crear un gasto compartido desde el celular de un miembro, los otros miembros del hogar reciben una notificación push con el monto que les toca y deep-link al detalle. Idem al registrar un pago (settlement) o al ser invitado a un hogar.

### Checkpoint 18 — Deploy

- ⏳ Dockerfile del API probado (multi-stage alpine, `CGO_ENABLED=0`, `TARGETARCH` dinámico). **Un solo binario** — los workers (fxrates / incomes / expenses / insights / reports email) corren in-process dentro del API, no hay binario worker separado
- ⏳ Postgres compartido en Coolify con DB dedicada `ahorra`
- ⏳ Migraciones aplicadas con `migrate` CLI desde la máquina local apuntando a la DB prod (`migrate -path migrations -database "$DATABASE_URL_PROD" up`)
- ⏳ Go API en Coolify con HTTPS (Traefik auto), dominio `api-ahorra.lemydev.com`
- ⏳ Env en Coolify: `ENV=prod`, `ALLOWED_ORIGINS` con dominio del front + `http://localhost:3000` para dev local, `JWT_SECRET` / `JWT_REFRESH_SECRET` random 64 hex
- ⏳ Resend: subdominio `ahorra.lemydev.com` verificado en la cuenta, `RESEND_API_KEY` + `REPORT_FROM_EMAIL=Ahorra <mensual@ahorra.lemydev.com>` en Coolify
- ⏳ Next.js PWA en Coolify con HTTPS, `NEXT_PUBLIC_API_URL` apuntando al API prod
- ⏳ Healthcheck `/health/live` (configurado en Dockerfile con `wget`) activo en Coolify
- ⏳ Test end-to-end: registrar A, invitar B, ambos registran gastos con cuotas, ven balances, pagan deudas, ven insights al día siguiente, reciben email mensual el día 1 del mes siguiente.

**Entregable:** sistema completo deployado, usado desde el celular.

---

## Decisiones técnicas confirmadas

- **Duda 1 (gastos compartidos con cuotas):** opción B — deuda activada **cuota a cuota** con `billing_date <= hoy`. Cambiar a "total inmediato" es un solo WHERE clause si alguna vez cambia el criterio.
- **Duda 2 (edición de `is_shared`):** opción B — **inmutable**. Si te equivocás, borrás y recreás.
- **Duda 3 (delete de expense con settlements):** opción B — **CASCADE recalcula balance**. Si queda saldo negativo en sentido contrario, es correcto: el pago quedó como préstamo.
- **Split weights:** decimales libres, se normalizan al dividir (`share_i = weight_i / SUM × amount`).
- **Settlements sin payment method**, con validación `amount ≤ deuda actual`.
- **Goals `scope`:** `household` (compartido, todos lo ven) y `user` (personal). Conviven en la misma tabla con CHECK constraint.
- **Docker sí**, pero solo para la DB local. Imagen `supabase/postgres:17.4.1.032` para matchear exactamente lo que hay en Coolify. Puerto host **5433** porque 5432 lo tenía Postgres nativo de Windows.
- **Config con `.env` + parser propio** (sin `godotenv`, sin `viper`). Struct `Config` + `Load()` que valida. JWT secrets obligatorios >= 32 chars.
- **Migraciones incrementales por dominio.** NO una mega-migración 000001 con 18 tablas.
- **Slices verticales, no horizontales.** Cada checkpoint es una feature completa punta a punta.
- **Sin Redis, sin CLI, sin tabla `refresh_tokens`.**
- **Multi-tenant desde el día 1.** Todas las tablas de datos cuelgan de `household_id`.
- **Denormalización de multi-moneda** en cada expense/income. La conversión sucede una vez y queda congelada.
- **Balance on-demand, nunca cacheado.** Evita inconsistencias.

---

## Qué se aprende construyendo esto

| Habilidad | Aplica en |
|---|---|
| Estructura `cmd/` + `internal/` con capas claras | Todo proyecto Go serio |
| Handler → service → repo → sqlcgen con errores centinela | API del marketplace (próximo proyecto) |
| sqlc + pgx/v5 con overrides UUID | Queries tipadas en cualquier app Go con Postgres |
| JWT access + refresh rotativo sin tabla | Auth moderna sin depender de Redis |
| Multi-tenant con middleware + header de contexto | SaaS que tenga noción de team/organización |
| Denormalización de multi-moneda con snapshot del rate | Cualquier feature financiera con FX |
| Tabla unificada de cuotas (1 fila para pago único, N para crédito) | Modelado de schedules de pago |
| Balance on-demand con queries agregadas | Libros contables / split bills |
| Worker Go con múltiples goroutines + tickers | Jobs programados sin cron externo |
| Migraciones incrementales + slices verticales | Entregar software iterativo sin breaking changes |
| PWA Next.js instalable + SWR + Server Actions | Frontend moderno contra API externa |
| Deploy Coolify ARM con Dockerfile multi-stage | Deploy barato, sin Kubernetes |

---

## Después de terminarlo

Usar la app durante 2-3 semanas como la única app de gastos. Aparecen:

- Bugs que no se ven en dev.
- Features que faltan (búsqueda, export CSV, transferencias entre medios, presupuesto mensual más granular).
- Problemas de UX en mobile real.
- Logs que hacen falta pero no están.
- Casos de borde con el blue (ej: día muy volátil con muchas actualizaciones).

Cada uno de esos hallazgos es aprendizaje que ningún tutorial da. Después de esa fase de uso real, recién ahí tiene sentido arrancar el próximo proyecto (hub de notificaciones o marketplace).
