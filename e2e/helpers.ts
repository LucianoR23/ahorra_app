import { expect, type Page } from "@playwright/test";

// Set-up goes straight to the API; only the flow under test uses the UI.
export const API_URL = "http://localhost:8080";
export const PASSWORD = "E2e-password-123";

export type User = { id: string; email: string; token: string };

let counter = 0;
export function uniqueEmail(tag: string) {
  counter++;
  return `e2e-${tag}-${Date.now()}-${counter}@example.test`;
}

async function call<T>(method: string, path: string, opts: { token?: string; household?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
      ...(opts.household ? { "X-Household-ID": opts.household } : {}),
    },
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${text}`);
  return (text ? JSON.parse(text) : undefined) as T;
}

/**
 * Registers a user through the API. Onboarding (plan 1.3) is marked done
 * unless `onboarded` is false, so specs land on Inicio.
 */
export async function register(tag: string, firstName: string, opts: { inviteToken?: string; onboarded?: boolean } = {}): Promise<User> {
  const email = uniqueEmail(tag);
  const r = await call<{ user: { id: string }; accessToken: string }>("POST", "/auth/register", {
    body: { email, password: PASSWORD, firstName, lastName: "E2E", ...(opts.inviteToken ? { inviteToken: opts.inviteToken } : {}) },
  });
  if (opts.onboarded !== false) await call("POST", "/me/onboarding/complete", { token: r.accessToken });
  return { id: r.user.id, email, token: r.accessToken };
}

export async function createHousehold(owner: User, name: string): Promise<string> {
  const h = await call<{ id: string }>("POST", "/households", { token: owner.token, body: { name, baseCurrency: "ARS" } });
  return h.id;
}

/** Registers a new user who joins the household through an invite. */
export async function addMember(owner: User, householdId: string, firstName: string): Promise<User> {
  const email = uniqueEmail(firstName.toLowerCase());
  const inv = await call<{ token: string }>("POST", `/households/${householdId}/invites`, { token: owner.token, body: { email } });
  const r = await call<{ user: { id: string }; accessToken: string }>("POST", "/auth/register", {
    body: { email, password: PASSWORD, firstName, lastName: "E2E", inviteToken: inv.token },
  });
  await call("POST", "/me/onboarding/complete", { token: r.accessToken });
  return { id: r.user.id, email, token: r.accessToken };
}

/** A credit card whose current period closes today, so a purchase made today is billed today. */
export async function cardClosingToday(owner: User, name: string): Promise<string> {
  const today = localDate(0);
  const pm = await call<{ id: string }>("POST", "/payment-methods", {
    token: owner.token,
    body: {
      name, kind: "credit",
      creditCard: { alias: name, defaultClosingDay: Number(today.slice(8)), defaultDueDay: 28,
        currentPeriod: { closingDate: today, dueDate: localDate(10) } },
    },
  });
  return pm.id;
}

/** A credit card whose period closed yesterday: its statement is the one to pay (plan 4.1). */
export async function cardClosedYesterday(owner: User, name: string): Promise<string> {
  const yesterday = localDate(-1);
  const pm = await call<{ id: string }>("POST", "/payment-methods", {
    token: owner.token,
    body: {
      name, kind: "credit",
      creditCard: { alias: name, defaultClosingDay: Number(yesterday.slice(8)), defaultDueDay: 28,
        currentPeriod: { closingDate: yesterday, dueDate: localDate(9) } },
    },
  });
  return pm.id;
}

/** The user's "Mi plata" space. */
export async function personalSpaceOf(user: User): Promise<string> {
  const list = await call<{ id: string; kind: string }[]>("GET", "/households", { token: user.token });
  return list.find((h) => h.kind === "personal")!.id;
}

/** Creates an expense and returns its id. */
export async function createExpense(user: User, householdId: string, body: Record<string, unknown>): Promise<string> {
  const r = await call<{ expense: { id: string } }>("POST", "/expenses", {
    token: user.token,
    household: householdId,
    body: { currency: "ARS", installments: 1, ...body },
  });
  return r.expense.id;
}

/** Creates an income and returns its id. */
export async function createIncome(user: User, householdId: string, body: Record<string, unknown>): Promise<string> {
  const r = await call<{ id: string }>("POST", "/incomes", {
    token: user.token,
    household: householdId,
    body: { currency: "ARS", source: "salary", ...body },
  });
  return r.id;
}

export async function cashOf(user: User): Promise<string> {
  const list = await call<{ id: string; kind: string }[]>("GET", "/payment-methods", { token: user.token });
  return list.find((p) => p.kind === "cash")!.id;
}

/** Creates a recurring expense (plan 1.10b screens). */
export async function createRecurringExpense(user: User, householdId: string, body: Record<string, unknown>) {
  await call("POST", "/recurring-expenses", {
    token: user.token,
    household: householdId,
    body: { currency: "ARS", installments: 1, frequency: "monthly", startsAt: localDate(0), ...body },
  });
}

/** Creates a recurring income (plan 1.10b screens). */
export async function createRecurringIncome(user: User, householdId: string, body: Record<string, unknown>) {
  await call("POST", "/recurring-incomes", {
    token: user.token,
    household: householdId,
    body: { currency: "ARS", source: "salary", frequency: "monthly", startsAt: localDate(0), ...body },
  });
}

/** Creates a goal (plan 1.10b screens). */
export async function createGoal(user: User, householdId: string, body: Record<string, unknown>) {
  await call("POST", "/goals", {
    token: user.token,
    household: householdId,
    body: { scope: "household", currency: "ARS", period: "monthly", ...body },
  });
}

/** A variable-amount monthly bill due today: creating it books today's draft. */
export async function variableBillDueToday(user: User, householdId: string, description: string, amount: number) {
  await call("POST", "/recurring-expenses", {
    token: user.token, household: householdId,
    body: {
      paymentMethodId: await cashOf(user), amount, currency: "ARS", description, installments: 1,
      frequency: "monthly", dayOfMonth: Number(localDate(0).slice(8)), startsAt: localDate(-40), amountIsVariable: true,
    },
  });
}

export async function listDrafts(user: User, householdId: string) {
  return call<{ id: string; amount: number; status: string }[]>("GET", "/expenses/drafts", { token: user.token, household: householdId });
}

/** YYYY-MM-DD in the local timezone (the API and the browser use the same one). */
export function localDate(offsetDays: number) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Logs in through the login form and waits for the home screen. Users created
 * by these helpers have not verified their email (no mail in E2E): today the
 * app sends them to /verify-email/pending after login, but lets them use the
 * app from "/" (soft verification), so the helper continues from there.
 */
export async function loginUI(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"));
  if (new URL(page.url()).pathname.startsWith("/verify-email")) await page.goto("/");
  await expect(page).toHaveURL(/\/$/);
  // The URL changes before the session is restored. Wait for the app shell
  // (rendered only once the refresh finished): navigating away earlier
  // aborts the refresh after the API rotated the cookie, the next page sends
  // the old one and the API ends the session as a reused token.
  await expect(page.getByRole("link", { name: "Movimientos" }).first()).toBeVisible();
}
