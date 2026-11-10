"use client";

import { apiFetch, type ApiRequest } from "./client";
import { ApiError } from "./errors";
import { refreshOnce } from "./refresh";
import { useAuthStore } from "@/stores/auth";
import { useHouseholdStore } from "@/stores/household";
import type {
  Expense,
  ExpenseDetail,
  Income,
  Installment,
  RecurringExpense,
  RecurringIncome,
  Currency,
  Settlement,
  Goal,
  SplitRulesResponse,
  Bank,
  PaymentMethod,
  PaymentMethodKind,
  CreditCard,
  CardNetwork,
  CreditCardPeriod,
  Household,
  Category,
  User,
  InsightGenerateResult,
  CardStatementDetail,
  PurchaseSimulation,
  AdjustmentKind,
} from "./schemas";
import { userSchema } from "./schemas";


type MutateOpts = {
  method: NonNullable<ApiRequest["method"]>;
  path: string;
  body?: unknown;
  query?: ApiRequest["query"];
  /** Default true — sends X-Household-ID. */
  householdScoped?: boolean;
  /** Sends this household instead of the current one. */
  householdId?: string;
};

/** Centralized mutation runner with 401-refresh-retry. */
export async function apiMutate<T = unknown>(opts: MutateOpts): Promise<T> {
  const householdScoped = opts.householdScoped ?? true;
  const token = useAuthStore.getState().accessToken;
  const householdId = opts.householdId ?? (householdScoped ? useHouseholdStore.getState().currentId : null);

  const run = (tk: string | null) =>
    apiFetch<T>({
      method: opts.method,
      path: opts.path,
      body: opts.body,
      query: opts.query,
      token: tk,
      householdId,
    });

  try {
    return await run(token);
  } catch (e) {
    if (e instanceof ApiError && e.code === "unauthorized") {
      const fresh = await refreshOnce();
      if (!fresh) throw e;
      return await run(fresh);
    }
    throw e;
  }
}

// --- Expenses -------------------------------------------------------------

export type ExpenseCreateInput = {
  categoryId?: string | null;
  paymentMethodId: string;
  amount: number;
  currency: Currency;
  description: string;
  spentAt: string;
  installments: number;
  isShared: boolean;
  sharesOverride?: { userId: string; amount: number }[];
  /** The dollar for this expense (plan 5.1); absent: the household's. */
  rateSource?: string;
};

/** Creates the expense in `householdId` ("Mi plata" or the hogar), or in the current space. */
export function createExpense(input: ExpenseCreateInput, householdId?: string) {
  return apiMutate<ExpenseDetail>({ method: "POST", path: "/expenses", body: input, householdId });
}

export type PurchaseSimulationInput = {
  paymentMethodId: string;
  categoryId?: string | null;
  amount: number;
  currency: string;
  installments: number;
  months?: number;
};

/** "¿Me lo puedo comprar?" (plan 4.8): a POST that saves nothing. */
export function simulatePurchase(input: PurchaseSimulationInput, householdId?: string) {
  return apiMutate<PurchaseSimulation>({ method: "POST", path: "/simulations/purchase", body: input, householdId });
}

export type ExpensePatchInput = {
  description?: string;
  spentAt?: string;
  categoryId?: string | null;
};

export function patchExpense(id: string, input: ExpensePatchInput) {
  return apiMutate<Expense>({ method: "PATCH", path: `/expenses/${id}`, body: input });
}

export function deleteExpense(id: string) {
  return apiMutate<void>({ method: "DELETE", path: `/expenses/${id}` });
}

// confirmDraftExpense: el usuario carga el monto real de una factura variable
// (luz/expensas/wifi) y el draft pasa a confirmed. El backend chequea el
// threshold y dispara insight recurring_spike si supera.
export function confirmDraftExpense(id: string, amount: number) {
  return apiMutate<Expense>({
    method: "POST",
    path: `/expenses/${id}/confirm`,
    body: { amount },
  });
}

/**
 * Tri-state for dueDate:
 *   undefined → omit field (keep)
 *   null      → send null (clear)
 *   string    → send value (set)
 * Same idea for billingDate.
 */
export type InstallmentPatchInput = {
  billingDate?: string | null;
  dueDate?: string | null;
  isPaid?: boolean;
};

export function patchInstallment(expenseId: string, n: number, input: InstallmentPatchInput) {
  const body: Record<string, unknown> = {};
  if ("billingDate" in input) body.billingDate = input.billingDate;
  if ("dueDate" in input) body.dueDate = input.dueDate;
  if (typeof input.isPaid === "boolean") body.isPaid = input.isPaid;
  return apiMutate<Installment>({
    method: "PATCH",
    path: `/expenses/${expenseId}/installments/${n}`,
    body,
  });
}

// --- Incomes --------------------------------------------------------------

export type IncomeCreateInput = {
  receivedBy?: string | null;
  paymentMethodId?: string | null;
  amount: number;
  currency: Currency;
  source: string;
  description?: string;
  receivedAt: string;
  /** The dollar for this income (plan 5.1); absent: the household's. */
  rateSource?: string;
};

export function createIncome(input: IncomeCreateInput) {
  return apiMutate<Income>({ method: "POST", path: "/incomes", body: input });
}

export type IncomePatchInput = {
  source?: string;
  description?: string;
  receivedAt?: string;
};

export function patchIncome(id: string, input: IncomePatchInput) {
  return apiMutate<Income>({ method: "PATCH", path: `/incomes/${id}`, body: input });
}

export function deleteIncome(id: string) {
  return apiMutate<void>({ method: "DELETE", path: `/incomes/${id}` });
}

// --- Recurring expenses ---------------------------------------------------

export type RecurringExpenseInput = {
  categoryId?: string | null;
  paymentMethodId: string;
  amount: number;
  currency: Currency;
  description: string;
  installments: number;
  isShared: boolean;
  frequency: "weekly" | "monthly" | "yearly";
  dayOfMonth?: number | null;
  dayOfWeek?: number | null;
  monthOfYear?: number | null;
  startsAt: string;
  endsAt?: string | null;
  amountIsVariable?: boolean;
  alertThresholdPct?: number | null;
};

export function createRecurringExpense(input: RecurringExpenseInput) {
  return apiMutate<RecurringExpense>({ method: "POST", path: "/recurring-expenses", body: input });
}

export function patchRecurringExpense(id: string, input: Partial<RecurringExpenseInput>) {
  return apiMutate<RecurringExpense>({
    method: "PATCH",
    path: `/recurring-expenses/${id}`,
    body: input,
  });
}

export function toggleRecurringExpense(id: string, isActive: boolean) {
  return apiMutate<void>({
    method: "PATCH",
    path: `/recurring-expenses/${id}/active`,
    body: { isActive },
  });
}

export function deleteRecurringExpense(id: string) {
  return apiMutate<void>({ method: "DELETE", path: `/recurring-expenses/${id}` });
}

// --- Recurring incomes ----------------------------------------------------

export type RecurringIncomeInput = {
  receivedBy?: string | null;
  paymentMethodId?: string | null;
  amount: number;
  currency: Currency;
  description?: string;
  source: string;
  frequency: "weekly" | "monthly" | "yearly";
  dayOfMonth?: number | null;
  dayOfWeek?: number | null;
  monthOfYear?: number | null;
  startsAt: string;
  endsAt?: string | null;
};

export function createRecurringIncome(input: RecurringIncomeInput) {
  return apiMutate<RecurringIncome>({ method: "POST", path: "/recurring-incomes", body: input });
}

export function patchRecurringIncome(id: string, input: Partial<RecurringIncomeInput>) {
  return apiMutate<RecurringIncome>({
    method: "PATCH",
    path: `/recurring-incomes/${id}`,
    body: input,
  });
}

export function toggleRecurringIncome(id: string, isActive: boolean) {
  return apiMutate<void>({
    method: "PATCH",
    path: `/recurring-incomes/${id}/active`,
    body: { isActive },
  });
}

export function deleteRecurringIncome(id: string) {
  return apiMutate<void>({ method: "DELETE", path: `/recurring-incomes/${id}` });
}

// --- Settlements ----------------------------------------------------------

export type SettlementCreateInput = {
  fromUser: string;
  toUser: string;
  amount: number;
  note?: string;
  paidAt?: string;
};

export function createSettlement(input: SettlementCreateInput) {
  return apiMutate<Settlement>({ method: "POST", path: "/settlements", body: input });
}

export function deleteSettlement(id: string) {
  return apiMutate<void>({ method: "DELETE", path: `/settlements/${id}` });
}

// --- Split rules ----------------------------------------------------------

export function patchSplitRules(items: { userId: string; weight: number }[], householdId?: string) {
  return apiMutate<SplitRulesResponse>({
    method: "PATCH",
    path: "/split",
    body: { items },
    householdId,
  });
}

// --- Goals ----------------------------------------------------------------

export type GoalCreateInput = {
  scope: "household" | "user";
  userId?: string | null;
  categoryId?: string | null;
  goalType: "category_limit" | "total_limit" | "savings";
  targetAmount: number;
  currency: Currency;
  period: "monthly" | "weekly";
};

export function createGoal(input: GoalCreateInput) {
  return apiMutate<Goal>({ method: "POST", path: "/goals", body: input });
}

export type GoalPatchInput = {
  categoryId?: string | null;
  targetAmount?: number;
  currency?: Currency;
  period?: "monthly" | "weekly";
};

export function patchGoal(id: string, input: GoalPatchInput) {
  return apiMutate<Goal>({ method: "PATCH", path: `/goals/${id}`, body: input });
}

export function toggleGoal(id: string, isActive: boolean) {
  return apiMutate<void>({
    method: "PATCH",
    path: `/goals/${id}/active`,
    body: { isActive },
  });
}

export function deleteGoal(id: string) {
  return apiMutate<void>({ method: "DELETE", path: `/goals/${id}` });
}

// --- Banks ----------------------------------------------------------------

export function createBank(name: string) {
  return apiMutate<Bank>({ method: "POST", path: "/banks", body: { name }, householdScoped: false });
}

export function patchBank(id: string, name: string) {
  return apiMutate<Bank>({ method: "PATCH", path: `/banks/${id}`, body: { name }, householdScoped: false });
}

export function activateBank(id: string) {
  return apiMutate<Bank>({ method: "POST", path: `/banks/${id}/activate`, householdScoped: false });
}

export function deactivateBank(id: string) {
  return apiMutate<Bank>({ method: "POST", path: `/banks/${id}/deactivate`, householdScoped: false });
}

// --- Payment methods ------------------------------------------------------

export type PaymentMethodCreateInput = {
  bankId?: string | null;
  name: string;
  kind: PaymentMethodKind;
  allowsInstallments: boolean;
  creditCard?: {
    alias: string;
    lastFour?: string | null;
    defaultClosingDay: number;
    defaultDueDay: number;
    debitPaymentMethodId?: string | null;
    network?: CardNetwork | null;
    // Fechas "YYYY-MM-DD" del ciclo concreto. El backend persiste
    // estos períodos junto con la tarjeta en la misma transacción.
    currentPeriod?: { closingDate: string; dueDate: string };
    nextPeriod?: { closingDate: string; dueDate: string };
  };
};

export function createPaymentMethod(input: PaymentMethodCreateInput) {
  return apiMutate<PaymentMethod>({ method: "POST", path: "/payment-methods", body: input, householdScoped: false });
}

export type PaymentMethodPatchInput = {
  name?: string;
  bankId?: string | null;
  allowsInstallments?: boolean;
};

export function patchPaymentMethod(id: string, input: PaymentMethodPatchInput) {
  return apiMutate<PaymentMethod>({ method: "PATCH", path: `/payment-methods/${id}`, body: input, householdScoped: false });
}

export function activatePaymentMethod(id: string) {
  return apiMutate<PaymentMethod>({ method: "POST", path: `/payment-methods/${id}/activate`, householdScoped: false });
}

export function deactivatePaymentMethod(id: string) {
  return apiMutate<PaymentMethod>({ method: "POST", path: `/payment-methods/${id}/deactivate`, householdScoped: false });
}

// --- Credit cards ---------------------------------------------------------

export type CreditCardPatchInput = {
  alias?: string;
  lastFour?: string | null;
  defaultClosingDay?: number;
  defaultDueDay?: number;
  debitPaymentMethodId?: string | null;
  network?: CardNetwork | null;
};

export function patchCreditCard(paymentMethodId: string, input: CreditCardPatchInput) {
  return apiMutate<CreditCard>({
    method: "PATCH",
    path: `/payment-methods/${paymentMethodId}/credit-card`,
    body: input,
    householdScoped: false,
  });
}

// --- Credit card periods --------------------------------------------------

export function upsertCreditCardPeriod(
  paymentMethodId: string,
  ym: string,
  input: { closingDate: string; dueDate: string },
) {
  return apiMutate<CreditCardPeriod>({
    method: "PUT",
    path: `/payment-methods/${paymentMethodId}/credit-card/periods/${ym}`,
    body: input,
    householdScoped: false,
  });
}

export function deleteCreditCardPeriod(paymentMethodId: string, ym: string) {
  return apiMutate<void>({
    method: "DELETE",
    path: `/payment-methods/${paymentMethodId}/credit-card/periods/${ym}`,
    householdScoped: false,
  });
}

// --- Credit card statements (plan 4.1) -----------------------------------

function statementPath(paymentMethodId: string, ym: string) {
  return `/payment-methods/${paymentMethodId}/credit-card/statements/${ym}`;
}

/** Amount omitted pays the total; currency omitted means pesos (or the only one). */
export function payCardStatement(paymentMethodId: string, ym: string, input: { amount?: number; currency?: Currency } = {}) {
  return apiMutate<CardStatementDetail>({ method: "POST", path: `${statementPath(paymentMethodId, ym)}/pay`, body: input, householdScoped: false });
}

export function unpayCardStatement(paymentMethodId: string, ym: string) {
  return apiMutate<CardStatementDetail>({ method: "POST", path: `${statementPath(paymentMethodId, ym)}/unpay`, householdScoped: false });
}

/** null clears it. In pesos. */
export function setStatementMinimum(paymentMethodId: string, ym: string, minimumPayment: number | null) {
  return apiMutate<CardStatementDetail>({ method: "PATCH", path: statementPath(paymentMethodId, ym), body: { minimumPayment }, householdScoped: false });
}

export type AdjustmentInput = { kind: AdjustmentKind; description: string; amount: number; currency: Currency };

export function createStatementAdjustment(paymentMethodId: string, ym: string, input: AdjustmentInput) {
  return apiMutate<CardStatementDetail>({ method: "POST", path: `${statementPath(paymentMethodId, ym)}/adjustments`, body: input, householdScoped: false });
}

export function updateStatementAdjustment(paymentMethodId: string, ym: string, id: string, input: AdjustmentInput) {
  return apiMutate<CardStatementDetail>({ method: "PATCH", path: `${statementPath(paymentMethodId, ym)}/adjustments/${id}`, body: input, householdScoped: false });
}

export function deleteStatementAdjustment(paymentMethodId: string, ym: string, id: string) {
  return apiMutate<CardStatementDetail>({ method: "DELETE", path: `${statementPath(paymentMethodId, ym)}/adjustments/${id}`, householdScoped: false });
}

// --- Households -----------------------------------------------------------

export function createHousehold(input: { name: string; baseCurrency: Currency }) {
  return apiMutate<Household>({
    method: "POST",
    path: "/households",
    body: input,
    householdScoped: false,
  });
}

export function patchHousehold(id: string, input: { name?: string; baseCurrency?: Currency; fxSource?: string }) {
  return apiMutate<Household>({
    method: "PATCH",
    path: `/households/${id}`,
    body: input,
    householdScoped: false,
  });
}

export function deleteHousehold(id: string) {
  return apiMutate<void>({ method: "DELETE", path: `/households/${id}`, householdScoped: false });
}

export function removeHouseholdMember(householdId: string, userId: string) {
  return apiMutate<void>({
    method: "DELETE",
    path: `/households/${householdId}/members/${userId}`,
    householdScoped: false,
  });
}

/**
 * Transfiere la propiedad del hogar al `userId` indicado. El caller debe ser owner.
 * Endpoint real: PATCH /households/{id}/members/{userId}/role con { role: "owner" }.
 */
export function transferHouseholdOwnership(householdId: string, userId: string) {
  // The API answers 204 with no body.
  return apiMutate<void>({
    method: "PATCH",
    path: `/households/${householdId}/members/${userId}/role`,
    body: { role: "owner" },
    householdScoped: false,
  });
}

// --- Household invites (flow por email + token) ---------------------------

export type HouseholdInvite = {
  id: string;
  householdId: string;
  email: string;
  invitedBy: string;
  expiresAt: string;
  createdAt: string;
  status: "pending" | "accepted" | "revoked" | "expired";
};

export type CreateInviteResponse = {
  invite: HouseholdInvite;
  token: string;
  acceptUrl: string;
  emailSent: boolean;
};

export function createHouseholdInvite(householdId: string, email: string) {
  return apiMutate<CreateInviteResponse>({
    method: "POST",
    path: `/households/${householdId}/invites`,
    body: { email },
    householdScoped: false,
  });
}

export function revokeHouseholdInvite(inviteId: string) {
  return apiMutate<void>({
    method: "DELETE",
    path: `/households/invites/${inviteId}`,
    householdScoped: false,
  });
}

export function resendHouseholdInvite(inviteId: string) {
  return apiMutate<CreateInviteResponse>({
    method: "POST",
    path: `/households/invites/${inviteId}/resend`,
    householdScoped: false,
  });
}

export type InvitePreview = {
  householdId: string;
  householdName: string;
  email: string;
  expiresAt: string;
  status: "pending" | "accepted" | "revoked" | "expired";
};

export async function getInvitePreview(token: string): Promise<InvitePreview> {
  return apiFetch<InvitePreview>({
    method: "GET",
    path: `/invites/${encodeURIComponent(token)}`,
  });
}

export function acceptInvite(token: string) {
  return apiMutate<{ householdId: string; userId: string; role: string; joinedAt: string }>({
    method: "POST",
    path: `/invites/accept`,
    body: { token },
    householdScoped: false,
  });
}

// --- Me (perfil) ----------------------------------------------------------

export type MePatchInput = {
  firstName?: string;
  lastName?: string;
  email?: string;
};

export async function patchMe(input: MePatchInput): Promise<User> {
  const json = await apiMutate<unknown>({
    method: "PATCH",
    path: "/me",
    body: input,
    householdScoped: false,
  });
  return userSchema.parse(json);
}

/** Onboarding finished or skipped (plan 1.3). Idempotent. */
export async function completeOnboarding(): Promise<User> {
  const json = await apiMutate<unknown>({
    method: "POST",
    path: "/me/onboarding/complete",
    householdScoped: false,
  });
  return userSchema.parse(json);
}

export function deleteMe() {
  return apiMutate<void>({
    method: "DELETE",
    path: "/me",
    householdScoped: false,
  });
}

// --- Push subscriptions management ----------------------------------------

export type PushSubscriptionDTO = {
  id: string;
  endpoint: string;
  userAgent?: string;
  createdAt: string;
  lastSeenAt: string;
};

export function deletePushSubscriptionById(id: string) {
  return apiMutate<void>({
    method: "DELETE",
    path: `/push/subscriptions/${id}`,
    householdScoped: false,
  });
}

// --- Admin (superadmin) ---------------------------------------------------

export function restoreAdminHousehold(id: string) {
  return apiMutate<void>({
    method: "POST",
    path: `/admin/households/${id}/restore`,
    householdScoped: false,
  });
}

export function purgeAdminHousehold(id: string) {
  return apiMutate<void>({
    method: "DELETE",
    path: `/admin/households/${id}/purge`,
    householdScoped: false,
  });
}

// --- Insights -------------------------------------------------------------

export function markInsightRead(id: string) {
  return apiMutate<void>({ method: "POST", path: `/insights/${id}/read` });
}

export function markAllInsightsRead(userId?: string | null) {
  return apiMutate<void>({
    method: "POST",
    path: "/insights/mark-all-read",
    query: userId ? { userId } : undefined,
  });
}

/** Ends every session of the account, on every device (plan 0.5). */
export function logoutAll() {
  return apiMutate<void>({ method: "POST", path: "/auth/logout-all", householdScoped: false });
}

/** A single-use ticket to open the insights stream (valid 60 s, plan 0.9). */
export function requestStreamTicket() {
  return apiMutate<{ ticket: string; expiresIn: number }>({ method: "POST", path: "/insights/stream-ticket" });
}

export function deleteInsight(id: string) {
  return apiMutate<void>({ method: "DELETE", path: `/insights/${id}` });
}

export function generateInsights(at?: string) {
  return apiMutate<InsightGenerateResult>({
    method: "POST",
    path: "/insights/generate",
    query: at ? { at } : undefined,
  });
}

export type AdminTestPushResult = {
  sent: boolean;
  subscriptions: number;
  reason?: string;
};

export function adminSendTestPush() {
  return apiMutate<AdminTestPushResult>({
    method: "POST",
    path: "/admin/push/test",
  });
}

// --- Categories -----------------------------------------------------------

export type CategoryInput = {
  name: string;
  icon?: string | null;
  color?: string | null;
  /** Makes it a subcategory; on PATCH, null makes it top-level and leaving it out keeps it. */
  parentId?: string | null;
};

export function createCategory(input: CategoryInput) {
  return apiMutate<Category>({ method: "POST", path: "/categories", body: input });
}

export function patchCategory(id: string, input: CategoryInput) {
  return apiMutate<Category>({ method: "PATCH", path: `/categories/${id}`, body: input });
}

export function deleteCategory(id: string) {
  return apiMutate<void>({ method: "DELETE", path: `/categories/${id}` });
}
