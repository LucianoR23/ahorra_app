# Ahorra API Reference

Backend: Go + chi. Base URL (dev): `http://localhost:8080`.

This document covers every HTTP endpoint exposed by the API. It is intended as a practical reference for frontend integration — it does not explain backend internals.

---

## 1. Overview

### 1.1 Auth model

- **Access token**: short-lived JWT (15 min). Send it on every protected request as `Authorization: Bearer <accessToken>`.
- **Refresh token**: httpOnly cookie set by the server on `/auth/register`, `/auth/login`, `/auth/refresh`.
  - Cookie name: `ahorra_refresh` (dev) / `__Host-ahorra_refresh` (prod).
  - `SameSite=Strict`, `Secure` only in prod. The frontend never reads it directly — just calls `POST /auth/refresh` and the browser attaches the cookie.
- **Household context**: endpoints that touch household-scoped data (expenses, incomes, categories, goals, etc.) require the header `X-Household-ID: <uuid>`. The middleware (`households.RequireHouseholdMember`) rejects callers that are not members of that household with `403 forbidden` (or `404 not_found` if the household id is unknown / not a member).
- Endpoints under `/banks`, `/payment-methods`, `/exchange-rates`, `/auth`, `/me`, `/households` do **not** read `X-Household-ID`. Ownership of a bank/payment-method is validated by `userID` from the token.

### 1.2 Headers

| Header              | When                                                         |
|---------------------|--------------------------------------------------------------|
| `Authorization`     | All non-auth endpoints. `Bearer <accessToken>`.              |
| `X-Household-ID`    | All household-scoped endpoints (see section index).          |
| `Content-Type`      | `application/json` on any request with a body.               |

### 1.3 Error shape

All errors are JSON with stable `code` values:

```json
{ "code": "validation", "message": "formato debe ser YYYY-MM-DD", "field": "spentAt" }
```

| HTTP | `code`         | Meaning                                                    |
|------|----------------|------------------------------------------------------------|
| 401  | `unauthorized` | Missing / invalid / expired token.                         |
| 403  | `forbidden`    | Authenticated but not allowed (non-member / non-owner).    |
| 404  | `not_found`    | Resource does not exist (or not visible to the caller).    |
| 409  | `conflict`     | Duplicate / state conflict (e.g. email already registered).|
| 422  | `validation`   | Body / params invalid. `field` points to the offending key.|
| 500  | `internal`     | Server bug. Message is always `"error interno"`.           |

JSON bodies are decoded in strict mode — **unknown fields cause a 422**.

### 1.4 Conventions

- Dates: `"YYYY-MM-DD"` strings (e.g. `"2026-04-19"`).
- Months: `"YYYY-MM"` strings.
- Timestamps: ISO-8601 with timezone (Go `time.Time`).
- `currency` values: `"ARS"` | `"USD"` | `"EUR"`.
- Amounts: `float64`. Any field ending in `_base` / `AmountBase` is already converted to the household's `baseCurrency` (the FX rate used is frozen at creation time and returned as `rateUsed` / `rateAt`).
- UUIDs are plain strings.
- Lists that paginate expose `limit` (default 50, max 200) and `offset` (default 0) query params, and return `{ items, totalCount, limit, offset }`.

### 1.5 CORS & credentials

El server valida el header `Origin` contra la lista de `ALLOWED_ORIGINS` configurada en el backend (coma-separado). Si el origen no matchea, el browser bloquea la respuesta. Configuración del middleware:

- **Allowed methods**: `GET, POST, PUT, PATCH, DELETE, OPTIONS`.
- **Allowed headers**: `Accept, Authorization, Content-Type, X-Household-ID, X-Request-ID`.
- **Exposed headers**: `X-Request-ID`.
- **AllowCredentials**: `true` — necesario para que la cookie de refresh viaje en requests cross-origin.
- Preflight (`OPTIONS`) cacheado por 300s.

Todo cliente browser-based que quiera usar el refresh flow **debe** mandar sus requests con credenciales (`fetch(..., { credentials: "include" })` o equivalente). Sin esto, el browser no adjunta la cookie `ahorra_refresh` y `POST /auth/refresh` devuelve 401.

El access token es responsabilidad del cliente — guardalo en memoria. No lo persistas en `localStorage` / `sessionStorage` (vulnerable a XSS). En reload, llamás a `POST /auth/refresh` y obtenés un access nuevo vía la cookie.

### 1.6 Health checks

| Method | Path            | Auth | Purpose                              |
|--------|-----------------|------|--------------------------------------|
| GET    | `/health/live`  | none | Liveness probe.                      |
| GET    | `/health/ready` | none | Readiness probe (checks DB pool).    |

---

## 2. Auth

No `X-Household-ID` needed. `/me` requires the access token; the other four are public.

### POST /auth/register

Create a new user. Also bootstraps a default `"Efectivo"` payment method for the user.

Body:
```json
{ "email": "a@b.com", "password": "secret123", "firstName": "Luciano", "lastName": "R" }
```

201 response:
```json
{
  "user": { "id": "uuid", "email": "a@b.com", "firstName": "Luciano", "lastName": "R" },
  "accessToken": "jwt...",
  "accessExpiresAt": "2026-04-19T12:00:00Z"
}
```

Sets the refresh cookie.

### POST /auth/login

Body: `{ "email": "a@b.com", "password": "secret123" }`. 200 response identical to register.

### POST /auth/refresh

No body. Reads the refresh cookie. Returns `{ "accessToken", "accessExpiresAt" }` and rotates the cookie. On failure clears the cookie and returns 401.

### POST /auth/logout

No body. Clears the refresh cookie. `204 No Content`.

### GET /me

Auth: Bearer token required.

200 response:
```json
{ "id": "uuid", "email": "a@b.com", "firstName": "Luciano", "lastName": "R" }
```

---

## 3. Households

Auth: Bearer token. `X-Household-ID` is **not** used here — the household id comes from the path.

### GET /households

List households where the caller is a member.

200: `householdDTO[]`.

### POST /households

Create a household (creator becomes owner, gets the 7 default categories and a split-rule weight of 1.0).

Body:
```json
{ "name": "Casa", "baseCurrency": "ARS" }
```

201: `householdDTO`.

### GET /households/{id}

Ownership: must be member. Returns `householdDTO`, or `404 not_found`.

### PATCH /households/{id}

Update name / baseCurrency. Only the owner can modify.

Body: `{ "name": "Nueva Casa", "baseCurrency": "USD" }`. 200: `householdDTO`.

### DELETE /households/{id}

Owner only. `204 No Content`.

### GET /households/{id}/members

Member only. Returns `memberDTO[]`:
```json
[{ "userId": "uuid", "email": "...", "firstName": "...", "lastName": "...", "role": "owner|member", "joinedAt": "..." }]
```

### POST /households/{id}/members

Owner-only invite. Body: `{ "email": "new@user.com" }`.

201 response:
```json
{ "userId": "uuid", "householdId": "uuid", "role": "member", "joinedAt": "..." }
```

### DELETE /households/{id}/members/{userId}

Owner removes a member (or a member leaves themselves). `204`.

### `householdDTO`

```json
{
  "id": "uuid",
  "name": "Casa",
  "baseCurrency": "ARS",
  "createdBy": "uuid",
  "createdAt": "...",
  "updatedAt": "..."
}
```

---

## 4. Payment Methods (banks, methods, credit cards)

Auth: Bearer token. **No `X-Household-ID`** — these are owned by the user, not the household. Ownership is enforced in-service via the user id from the token.

### Banks

| Method | Path                              | Purpose                        | Body / Query                 | Response        |
|--------|-----------------------------------|--------------------------------|------------------------------|-----------------|
| GET    | `/banks`                          | List caller's banks            | —                            | `bankDTO[]`     |
| POST   | `/banks`                          | Create bank                    | `{ "name": "Galicia" }`      | 201 `bankDTO`   |
| PATCH  | `/banks/{id}`                     | Rename bank                    | `{ "name": "Galicia Mas" }`  | `bankDTO`       |
| POST   | `/banks/{id}/deactivate`          | Soft-deactivate                | —                            | `bankDTO`       |
| POST   | `/banks/{id}/activate`            | Re-activate                    | —                            | `bankDTO`       |

`bankDTO`:
```json
{ "id": "uuid", "ownerUserId": "uuid", "name": "Galicia", "isActive": true, "createdAt": "..." }
```

### Payment methods

| Method | Path                                         | Purpose                                   |
|--------|----------------------------------------------|-------------------------------------------|
| GET    | `/payment-methods`                           | List caller's payment methods.            |
| POST   | `/payment-methods`                           | Create (optionally with credit-card block).|
| PATCH  | `/payment-methods/{id}`                      | Update name / bank / allowsInstallments.  |
| POST   | `/payment-methods/{id}/deactivate`           | Soft-deactivate.                          |
| POST   | `/payment-methods/{id}/activate`             | Re-activate.                              |
| GET    | `/payment-methods/{id}/credit-card`          | Get the credit-card block (if `kind=credit`).|
| PATCH  | `/payment-methods/{id}/credit-card`          | Update credit-card settings.              |

Create body:
```json
{
  "bankId": "uuid or null",
  "name": "Visa Galicia",
  "kind": "cash | debit | credit | transfer | other",
  "allowsInstallments": true,
  "creditCard": {
    "alias": "Visa",
    "lastFour": "1234",
    "defaultClosingDay": 20,
    "defaultDueDay": 5,
    "debitPaymentMethodId": "uuid (cuenta donde se debita) or null",
    "currentPeriod": { "closingDate": "2026-04-20", "dueDate": "2026-05-05" },
    "nextPeriod":    { "closingDate": "2026-05-20", "dueDate": "2026-06-05" }
  }
}
```

Update body (`PATCH /payment-methods/{id}`):
```json
{ "name": "Visa Gold", "bankId": "uuid?", "allowsInstallments": true }
```

Update credit-card body:
```json
{
  "alias": "Visa",
  "lastFour": "1234",
  "defaultClosingDay": 20,
  "defaultDueDay": 5,
  "debitPaymentMethodId": "uuid?"
}
```

Response DTOs:

`paymentMethodDTO`:
```json
{
  "id": "uuid", "ownerUserId": "uuid",
  "bankId": "uuid?", "name": "Visa",
  "kind": "credit", "allowsInstallments": true,
  "isActive": true, "createdAt": "..."
}
```

`creditCardDTO`:
```json
{
  "id": "uuid", "paymentMethodId": "uuid",
  "alias": "Visa", "lastFour": "1234?",
  "defaultClosingDay": 20, "defaultDueDay": 5,
  "debitPaymentMethodId": "uuid?", "createdAt": "..."
}
```

`POST /payment-methods` returns `paymentMethodDTO` extended with optional `creditCard` and `periods: creditCardPeriodDTO[]`.

---

## 5. Credit Card Periods

Auth: Bearer token. No `X-Household-ID`. `{id}` is the **payment-method id** (not the credit-card id — service resolves it).

Period `ym` path param format: `"YYYY-MM"`.

### GET /payment-methods/{id}/credit-card/periods

List all period overrides for the card.

200: `periodDTO[]`:
```json
{
  "creditCardId": "uuid",
  "periodYm": "2026-04",
  "closingDate": "2026-04-20",
  "dueDate": "2026-05-05",
  "createdAt": "...", "updatedAt": "..."
}
```

### GET /payment-methods/{id}/credit-card/periods/status

Returns whether the frontend should prompt the user to load a new period.

200:
```json
{
  "noPeriodsLoaded": false,
  "dueDatePassed": true,
  "latestPeriod": { /* periodDTO or null */ }
}
```

### PUT /payment-methods/{id}/credit-card/periods/{ym}

Upsert a specific month.

Body: `{ "closingDate": "2026-04-20", "dueDate": "2026-05-05" }`. 200: `periodDTO`.

### DELETE /payment-methods/{id}/credit-card/periods/{ym}

`204 No Content`.

---

## 6. Categories

Auth: Bearer + `X-Household-ID`.

| Method | Path                | Purpose              |
|--------|---------------------|----------------------|
| GET    | `/categories`       | List household cats. |
| POST   | `/categories`       | Create.              |
| PATCH  | `/categories/{id}`  | Update.              |
| DELETE | `/categories/{id}`  | Delete.              |

Create / Update body: `{ "name": "Comida", "icon": "utensils", "color": "#ff0000" }`.

`categoryDTO`:
```json
{
  "id": "uuid", "householdId": "uuid",
  "name": "Comida", "icon": "utensils", "color": "#ff0000",
  "createdAt": "...", "updatedAt": "..."
}
```

---

## 7. FX Rates

Auth: Bearer token. No `X-Household-ID`.

### GET /exchange-rates/current

Returns the latest in-memory rates for ARS/USD/EUR (updated every 15 min by the background worker from bluelytics). Sorted stable by `(currency, source)`.

200: `rateDTO[]`:
```json
{
  "currency": "USD",
  "source": "blue | oficial | mep | ... ",
  "rateAvg": 1080.5,
  "rateBuy": 1070.0,
  "rateSell": 1091.0,
  "lastUpdate": "2026-04-19T10:00:00Z",
  "fetchedAt": "2026-04-19T10:05:00Z"
}
```

---

## 8. Expenses

Auth: Bearer + `X-Household-ID`.

### GET /expenses

Query params (all optional):

| Param             | Type       | Notes                                    |
|-------------------|------------|------------------------------------------|
| `categoryId`      | uuid       |                                          |
| `paymentMethodId` | uuid       |                                          |
| `from`            | YYYY-MM-DD | Filters `spent_at >= from`.              |
| `to`              | YYYY-MM-DD |                                          |
| `limit`           | int 1..200 | Default 50.                              |
| `offset`          | int >=0    | Default 0.                               |

200:
```json
{
  "items": [ /* expenseDTO */ ],
  "totalCount": 142,
  "limit": 50,
  "offset": 0
}
```

### POST /expenses

Body:
```json
{
  "categoryId": "uuid or null",
  "paymentMethodId": "uuid",
  "amount": 1500.0,
  "currency": "ARS",
  "description": "Super",
  "spentAt": "2026-04-19",
  "installments": 1,
  "isShared": true,
  "sharesOverride": [
    { "userId": "uuid", "amount": 750.0 },
    { "userId": "uuid", "amount": 750.0 }
  ]
}
```

- `installments >= 1`. The service creates one installment row per cuota, copying the credit-card period overrides into `billingDate` / `dueDate` when applicable.
- `sharesOverride` is optional. If omitted and `isShared=true`, split-rules weights are used. If `isShared=false`, no shares are generated.

201: `expenseDetailDTO`:
```json
{
  "expense": { /* expenseDTO */ },
  "installments": [ /* installmentDTO */ ]
}
```

### GET /expenses/{id}

200: `expenseDetailDTO`.

### PATCH /expenses/{id}

Only a subset of fields can be edited after creation (amount/currency/installments/shares are immutable):

Body:
```json
{ "description": "Super (editado)", "spentAt": "2026-04-19", "categoryId": "uuid?" }
```

200: `expenseDTO`.

### DELETE /expenses/{id}

`204 No Content`.

### PATCH /expenses/{id}/installments/{n}

`n` is 1-based installment number.

Body (all fields optional — partial update):
```json
{
  "billingDate": "2026-05-20",
  "dueDate": "2026-06-05",
  "isPaid": true
}
```

Tri-state for `dueDate`:
- field absent → keep current value.
- `"dueDate": null` → clear it.
- `"dueDate": "YYYY-MM-DD"` → set.

200: `installmentDTO` (without `shares`).

### DTOs

`expenseDTO`:
```json
{
  "id": "uuid",
  "householdId": "uuid",
  "createdBy": "uuid",
  "categoryId": "uuid?",
  "paymentMethodId": "uuid",
  "amount": 1500.0,
  "currency": "ARS",
  "amountBase": 1500.0,
  "baseCurrency": "ARS",
  "rateUsed": 1.0,
  "rateAt": "2026-04-19T10:00:00Z",
  "description": "Super",
  "spentAt": "2026-04-19",
  "installments": 1,
  "isShared": true,
  "createdAt": "...", "updatedAt": "..."
}
```

`installmentDTO`:
```json
{
  "id": "uuid",
  "expenseId": "uuid",
  "installmentNumber": 1,
  "installmentAmount": 1500.0,
  "installmentAmountBase": 1500.0,
  "billingDate": "2026-04-20",
  "dueDate": "2026-05-05",
  "isPaid": false,
  "paidAt": null,
  "shares": [ { "userId": "uuid", "amountBaseOwed": 750.0 } ]
}
```

---

## 9. Incomes

Auth: Bearer + `X-Household-ID`.

### GET /incomes

Query params: `receivedBy` (uuid), `paymentMethodId` (uuid), `source` (string), `from`, `to` (YYYY-MM-DD), `limit` (1..200, default 50), `offset`.

200: `{ items: incomeDTO[], totalCount, limit, offset }`.

### POST /incomes

Body:
```json
{
  "receivedBy": "uuid?",
  "paymentMethodId": "uuid?",
  "amount": 300000,
  "currency": "ARS",
  "source": "salario",
  "description": "Abril",
  "receivedAt": "2026-04-05"
}
```

If `receivedBy` is omitted, the caller's user id is used. 201: `incomeDTO`.

### GET /incomes/{id}

200: `incomeDTO`.

### PATCH /incomes/{id}

Body: `{ "source": "...", "description": "...", "receivedAt": "YYYY-MM-DD" }`.

(Amount/currency cannot be edited — delete & recreate.)

### DELETE /incomes/{id}

`204`.

### GET /totals/income

Sum of incomes in base currency over a range.

Query: `from`, `to` (YYYY-MM-DD). Defaults: from = first day of current month, to = today.

200:
```json
{ "total": 650000, "baseCurrency": "ARS", "from": "2026-04-01", "to": "2026-04-19" }
```

### Recurring Incomes

| Method | Path                              | Purpose                       |
|--------|-----------------------------------|-------------------------------|
| GET    | `/recurring-incomes`              | List.                         |
| POST   | `/recurring-incomes`              | Create.                       |
| GET    | `/recurring-incomes/{id}`         | Get.                          |
| PATCH  | `/recurring-incomes/{id}`         | Update.                       |
| PATCH  | `/recurring-incomes/{id}/active`  | Toggle. Body `{ isActive }`.  |
| DELETE | `/recurring-incomes/{id}`         | Delete.                       |

Create body:
```json
{
  "receivedBy": "uuid?",
  "paymentMethodId": "uuid?",
  "amount": 300000,
  "currency": "ARS",
  "description": "Sueldo",
  "source": "salario",
  "frequency": "weekly | monthly | yearly",
  "dayOfMonth": 5,
  "dayOfWeek": null,
  "monthOfYear": null,
  "startsAt": "2026-04-05",
  "endsAt": "2027-04-05"
}
```

Update body is the same shape minus `startsAt` / `receivedBy`.

`incomeDTO`:
```json
{
  "id":"uuid","householdId":"uuid","receivedBy":"uuid",
  "paymentMethodId":"uuid?","amount":300000,"currency":"ARS",
  "amountBase":300000,"baseCurrency":"ARS","rateUsed":1.0,"rateAt":"...",
  "source":"salario","description":"Abril","receivedAt":"2026-04-05",
  "createdAt":"..."
}
```

`recurringDTO` (incomes variant) extends with `frequency`, `dayOfMonth?`, `dayOfWeek?`, `monthOfYear?`, `isActive`, `startsAt`, `endsAt?`, `lastGenerated?`.

---

## 10. Recurring Expenses

Auth: Bearer + `X-Household-ID`.

| Method | Path                                | Purpose                      |
|--------|-------------------------------------|------------------------------|
| GET    | `/recurring-expenses`               | List household templates.    |
| POST   | `/recurring-expenses`               | Create.                      |
| GET    | `/recurring-expenses/{id}`          | Get.                         |
| PATCH  | `/recurring-expenses/{id}`          | Update.                      |
| PATCH  | `/recurring-expenses/{id}/active`   | Toggle. Body `{ isActive }`. |
| DELETE | `/recurring-expenses/{id}`          | Delete.                      |

Create body:
```json
{
  "categoryId": "uuid?",
  "paymentMethodId": "uuid",
  "amount": 50000,
  "currency": "ARS",
  "description": "Netflix",
  "installments": 1,
  "isShared": false,
  "frequency": "weekly | monthly | yearly",
  "dayOfMonth": 5,
  "dayOfWeek": null,
  "monthOfYear": null,
  "startsAt": "2026-04-05",
  "endsAt": "2027-04-05"
}
```

`installments` defaults to 1 if 0 is sent. `frequency` and the corresponding day field must be provided together.

Response (`recurringDTO` for expenses):
```json
{
  "id":"uuid","householdId":"uuid","createdBy":"uuid",
  "categoryId":"uuid?","paymentMethodId":"uuid",
  "amount":50000,"currency":"ARS","description":"Netflix",
  "installments":1,"isShared":false,
  "frequency":"monthly","dayOfMonth":5,"dayOfWeek":null,"monthOfYear":null,
  "isActive":true,
  "startsAt":"2026-04-05","endsAt":"2027-04-05","lastGenerated":"2026-04-05",
  "createdAt":"..."
}
```

---

## 11. Settlements

Auth: Bearer + `X-Household-ID`. Amounts are in the household base currency.

### GET /settlements

Query: `fromUser` (uuid), `toUser` (uuid), `from`, `to` (YYYY-MM-DD), `limit` (1..200, default 50), `offset`.

200: `{ items: settlementDTO[] }`.

### POST /settlements

Body:
```json
{
  "fromUser": "uuid",
  "toUser": "uuid",
  "amount": 500,
  "note": "pago abril",
  "paidAt": "2026-04-19"
}
```

`paidAt` defaults to today if omitted. Amount is validated against current pair debt; service rejects overpayments with `422 validation`. 201: `settlementDTO`.

### GET /settlements/{id}

200: `settlementDTO`.

### DELETE /settlements/{id}

`204`.

### DTO

```json
{
  "id": "uuid",
  "householdId": "uuid",
  "fromUser": "uuid",
  "toUser": "uuid",
  "amount": 500.0,
  "baseCurrency": "ARS",
  "note": "pago abril",
  "paidAt": "2026-04-19",
  "createdAt": "..."
}
```

---

## 12. Split Rules

Auth: Bearer + `X-Household-ID`.

### GET /split

Any member can read.

200:
```json
{ "householdId": "uuid", "rules": [ { "userId": "uuid", "weight": 1.0 } ] }
```

### PATCH /split

Owner only (enforced in service → returns `403 forbidden` for non-owners).

Body (batch update):
```json
{ "items": [ { "userId": "uuid", "weight": 1.0 }, { "userId": "uuid", "weight": 2.0 } ] }
```

200: same shape as `GET /split` with the refreshed rules.

---

## 13. Balances

Auth: Bearer + `X-Household-ID`. Read-only; no pagination. Amounts are in household base currency.

### GET /balances

Net pairwise matrix for the household.

200:
```json
{
  "householdId": "uuid",
  "balances": [ { "from": "uuid", "to": "uuid", "amount": 1500.0 } ]
}
```

Each row means "from owes to". Only net positive rows are returned.

### GET /balances/me

Caller-centric view.

200:
```json
{
  "userId": "uuid",
  "owe":      [ { "from": "uuid", "to": "uuid", "amount": 800.0 } ],
  "owedToMe": [ { "from": "uuid", "to": "uuid", "amount": 1200.0 } ],
  "net": 400.0
}
```

`net > 0` = others owe the caller net. `net < 0` = caller owes net.

---

## 14. Goals

Auth: Bearer + `X-Household-ID`.

### GET /goals

Query params: `scope` (`household` | `user`), `userId` (uuid), `active` (`true`|`false`|`1`|`0`).

200: `goalDTO[]`.

### GET /goals/progress

Same query params + optional `at=YYYY-MM-DD` (default today). Returns the live progress snapshot for every goal that matches the filters.

200: `progressDTO[]`.

### POST /goals

Body:
```json
{
  "scope": "household | user",
  "userId": "uuid (required if scope=user)",
  "categoryId": "uuid (required for category_limit)",
  "goalType": "category_limit | total_limit | savings",
  "targetAmount": 100000,
  "currency": "ARS",
  "period": "monthly | yearly"
}
```

201: `goalDTO`.

### GET /goals/{id}

200: `goalDTO`.

### PATCH /goals/{id}

Body: `{ "categoryId": "uuid?", "targetAmount": 120000, "currency": "ARS", "period": "monthly" }`. 200: `goalDTO`.

### PATCH /goals/{id}/active

Body: `{ "isActive": true }`. `204`.

### DELETE /goals/{id}

`204`.

### GET /goals/{id}/progress

Query: `at=YYYY-MM-DD` (default today).

200: `progressDTO`.

### DTOs

`goalDTO`:
```json
{
  "id": "uuid",
  "householdId": "uuid",
  "scope": "household | user",
  "userId": "uuid?",
  "categoryId": "uuid?",
  "goalType": "category_limit | total_limit | savings",
  "targetAmount": 100000,
  "currency": "ARS",
  "period": "monthly | yearly",
  "isActive": true,
  "createdAt": "..."
}
```

`progressDTO`:
```json
{
  "goal": { /* goalDTO */ },
  "periodStart": "2026-04-01",
  "periodEnd":   "2026-04-30",
  "currentAmount": 42000,
  "targetAmount":  100000,
  "percent": 42.0,
  "status": "on_track | warning | exceeded | achieved"
}
```

---

## 15. Insights

Auth: Bearer + `X-Household-ID`.

Insights are generated automatically every day at 01:00 local time (weekly reviews on Sundays). Daily types: `daily_summary`, `alert_goal_warning`, `alert_goal_exceeded`, `weekly_review`. Records are idempotent per `(household, user, date, type)`.

### GET /insights

Query params:

| Param    | Type               | Notes                                  |
|----------|--------------------|----------------------------------------|
| `userId` | uuid               | Filter to one user.                    |
| `unread` | `true`/`false`/`1`/`0` | Only unread.                       |
| `from`   | YYYY-MM-DD         |                                        |
| `to`     | YYYY-MM-DD         |                                        |
| `type`   | string             | One of the insight type codes.         |
| `limit`  | int 1..200         |                                        |
| `offset` | int >=0            |                                        |

200: `insightDTO[]`.

### GET /insights/unread-count

Query: `userId?` (uuid). 200: `{ "unread": 3 }`.

### POST /insights/mark-all-read

Query: `userId?`. `204`.

### POST /insights/generate

Manual trigger (useful for first-use and testing — the worker runs once a day).

Query: `at=YYYY-MM-DD` (default today). 200: `{ "created": 4, "failed": 0 }`.

### GET /insights/{id}

200: `insightDTO`.

### POST /insights/{id}/read

Mark one insight as read. `204`.

### DELETE /insights/{id}

`204`.

### DTO

```json
{
  "id": "uuid",
  "householdId": "uuid",
  "userId": "uuid?",
  "insightDate": "2026-04-19",
  "insightType": "daily_summary",
  "title": "Gastaste $12.000 hoy",
  "body": "...",
  "severity": "info | warning | danger",
  "isRead": false,
  "metadata": { /* free-form JSON */ },
  "createdAt": "..."
}
```

---

## 16. Reports

Auth: Bearer + `X-Household-ID`. All read-only; amounts in household base currency.

### GET /reports/monthly

Query: `month=YYYY-MM` (default current month).

200:
```json
{
  "householdId": "uuid",
  "baseCurrency": "ARS",
  "month": "2026-04",
  "from": "2026-04-01",
  "to":   "2026-04-30",
  "spentThisMonth":  150000,
  "billedThisMonth": 120000,
  "dueThisMonth":     80000,
  "byCategory": [
    { "categoryId": "uuid?", "categoryName": "Comida", "total": 50000, "pct": 33.33, "txCount": 12 }
  ],
  "fixedVariable": {
    "fixedTotal": 90000, "variableTotal": 60000,
    "fixedPct": 60.0,    "variablePct": 40.0,
    "fixedCount": 5,     "variableCount": 12
  }
}
```

### GET /reports/trends

Query: `months` (default 6, clamped 1..24), `at=YYYY-MM-DD` (default today).

200:
```json
{
  "householdId": "uuid",
  "baseCurrency": "ARS",
  "months": 6,
  "points": [
    { "month": "2025-11", "spentTotal": 100000, "dueTotal": 80000, "income": 250000, "net": 170000 }
  ]
}
```

### GET /reports/ai-export

Query: `month=YYYY-MM`. Compact snapshot + pre-built prompt string for an LLM.

200:
```json
{
  "householdName": "Casa",
  "baseCurrency": "ARS",
  "month": "2026-04",
  "spent": 150000, "billed": 120000, "due": 80000,
  "fixedTotal": 90000, "variableTotal": 60000, "fixedPct": 60.0,
  "topCategories": [ { "name": "Comida", "total": 50000, "pct": 33.33, "txCount": 12 } ],
  "trendsLast6": [ /* TrendsPoint[] */ ],
  "prompt": "Analizá los gastos del hogar..."
}
```

---

## 17. Push Notifications (Web Push / VAPID)

El backend soporta **Web Push** estándar. Las suscripciones se guardan por dispositivo (endpoint UNIQUE). Las notificaciones se envían fire-and-forget desde el server cuando ocurren eventos clave; si el servicio no tiene VAPID configurado, `NotifyUsers` es no-op silencioso.

### Variables de entorno

| Variable           | Descripción                                           |
|--------------------|-------------------------------------------------------|
| `VAPID_PUBLIC_KEY` | Clave pública P-256 en base64url (obligatoria para enviar) |
| `VAPID_PRIVATE_KEY`| Clave privada P-256 en base64url                      |
| `VAPID_SUBJECT`    | `mailto:` o URL de contacto (e.g. `mailto:admin@ahorra.app`) |

Sin estas tres vars, los endpoints `/push/*` siguen funcionando (aceptan y persisten subs) pero no se envía ninguna notificación.

Generá el par de claves una sola vez por ambiente con el CLI incluido:
```bash
go run ./cmd/vapidgen
```
Copiá los valores resultantes como env vars en Coolify. **Regenerar las claves invalida todas las suscripciones existentes.**

---

### GET /push/vapid-public-key

Devuelve la clave pública VAPID. **Pública — no requiere auth.** El frontend la usa para crear el objeto `PushSubscription` vía `serviceWorkerRegistration.pushManager.subscribe()`.

200:
```json
{ "publicKey": "BFg3…base64url…" }
```

Si VAPID no está configurado devuelve igualmente 200 con `publicKey: ""` — el frontend puede usarlo para detectar que las push no están habilitadas en este ambiente.

---

### POST /push/subscriptions

Registra o actualiza la suscripción del dispositivo actual. **Requiere auth** (`Authorization: Bearer <accessToken>`).

Body:
```json
{
  "endpoint": "https://fcm.googleapis.com/fcm/send/…",
  "keys": {
    "p256dh": "BNc…base64url…",
    "auth":   "tBn…base64url…"
  },
  "userAgent": "Mozilla/5.0 …"   // opcional
}
```

- `endpoint` es UNIQUE en la tabla. Si ya existe para este user lo actualiza (upsert); si existe para otro user devuelve `409 conflict`.
- `userAgent` es opcional; se usa para diagnóstico.

204 (sin body) en caso de éxito.

| HTTP | `code`       | Cuándo                                                  |
|------|--------------|---------------------------------------------------------|
| 422  | `validation` | Faltan `endpoint` / `keys.p256dh` / `keys.auth`.        |
| 409  | `conflict`   | El endpoint ya está registrado para otro usuario.       |

---

### DELETE /push/subscriptions

Elimina la suscripción del dispositivo actual (unsubscribe). **Requiere auth.**

Body:
```json
{ "endpoint": "https://fcm.googleapis.com/fcm/send/…" }
```

204 (sin body). Si el endpoint no existe o pertenece a otro user devuelve igualmente 204 (idempotente).

---

### Triggers automáticos

Las notificaciones se envían automáticamente al ocurrir estos eventos:

| Evento                          | Destinatario              | Título / cuerpo de ejemplo                                       | Deep-link        |
|---------------------------------|---------------------------|------------------------------------------------------------------|------------------|
| `expenses.Create` con `isShared=true` | Cada miembro ≠ creador | `"{creator} cargó '{description}' — te toca $X {baseCurrency}"` | `/expenses/{id}` |
| `settlements.Create`            | `toUser` del settlement   | `"{fromUser} registró un pago a tu nombre"`                      | `/balances`      |
| `households.InviteByEmail`      | Usuario invitado          | `"Te invitaron al hogar '{householdName}'"`                      | `/households/{id}` |

El envío es **fire-and-forget** (goroutine separada del request). Las suscripciones con respuesta HTTP 404/410 del browser push service se eliminan automáticamente.

---

## 18. Resource relationships

**Expenses, installments, shares.** Creating an expense with `installments=N` writes `N` rows in `expense_installments` (numbered 1..N). Each installment has its own `billingDate`, optional `dueDate`, and `isPaid`. When the payment method is a credit card, the service picks billing/due from the matching `credit_card_periods` row if one exists for the installment's `YYYY-MM`, otherwise it derives them from `defaultClosingDay`/`defaultDueDay`. `PATCH /expenses/{id}/installments/{n}` lets the frontend mark an installment paid or move its billing/due date without touching the rest. When `isShared=true`, each installment also gets one `expense_installment_shares` row per member using the split-rule weights (or the explicit `sharesOverride`). `amountBaseOwed` per share is what flows into balances.

**Recurring expenses → expenses.** `recurring_expenses` rows are templates. A worker runs at 00:30 local time and calls `expensesSvc.Create` for each due recurring expense, copying all the logic (installments, shares, FX freeze, credit-card periods). The generated `expenses` row stores `recurring_expense_id`. `lastGenerated` on the template advances each run.

**Recurring incomes → incomes.** Same pattern as recurring expenses but simpler: no shares, no installments. Worker runs at 00:30.

**Goals vs categories.** A goal optionally references a `categoryId` (required when `goalType=category_limit`). Scope can be `household` (applies to everyone's spending in that household) or `user` (tied to a specific `userId`). Progress is computed live against `expense_installments` (for limits) and `incomes` (for savings); nothing is cached.

**Insights generation.** Daily worker at 01:00 local time generates `daily_summary`, goal alerts (at 80%/100% of a goal period), and `weekly_review` on Sundays. `UNIQUE(household_id, user_id, insight_date, insight_type)` makes regeneration idempotent. `POST /insights/generate` triggers the same pipeline for a single household on demand.

**Reports.** Read-only aggregations over `expenses` / `expense_installments` / `incomes`. No storage of their own. The monthly and AI-export endpoints derive numbers on each call.

**Settlements reduce balances.** `/balances` subtracts settlement amounts from the pair-net debt. The `POST /settlements` validation in-service rejects amounts higher than the currently outstanding debt for that pair.

**Split rules.** `split_rules` set the default weights per member when expenses are created with `isShared=true` and no explicit `sharesOverride`. The household owner seed is 1.0, and new invitees also get 1.0. Only the owner can `PATCH /split`.

**Credit card periods.** `credit_card_periods` override `closing_day`/`due_day` for a specific `YYYY-MM` on a given credit card. They are used (a) when listing/editing the card's periods, (b) when computing `billingDate`/`dueDate` for a new installment, and (c) by `GET /payment-methods/{id}/credit-card/periods/status` to tell the UI whether to prompt the user to enter next month's dates.
