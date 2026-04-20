"use client";

import { apiFetch, type ApiRequest } from "./client";
import { ApiError } from "./errors";
import { refresh } from "./auth";
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
  CreditCardPeriod,
  Household,
  Category,
} from "./schemas";

let refreshInflight: Promise<string | null> | null = null;
async function refreshOnce(): Promise<string | null> {
  if (refreshInflight) return refreshInflight;
  refreshInflight = (async () => {
    try {
      const r = await refresh();
      useAuthStore.getState().setToken(r.accessToken, r.accessExpiresAt);
      return r.accessToken;
    } catch {
      useAuthStore.getState().clear();
      return null;
    } finally {
      refreshInflight = null;
    }
  })();
  return refreshInflight;
}

type MutateOpts = {
  method: NonNullable<ApiRequest["method"]>;
  path: string;
  body?: unknown;
  query?: ApiRequest["query"];
  /** Default true — sends X-Household-ID. */
  householdScoped?: boolean;
};

/** Centralized mutation runner with 401-refresh-retry. */
export async function apiMutate<T = unknown>(opts: MutateOpts): Promise<T> {
  const householdScoped = opts.householdScoped ?? true;
  const token = useAuthStore.getState().accessToken;
  const householdId = householdScoped ? useHouseholdStore.getState().currentId : null;

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
};

export function createExpense(input: ExpenseCreateInput) {
  return apiMutate<ExpenseDetail>({ method: "POST", path: "/expenses", body: input });
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

export function patchSplitRules(items: { userId: string; weight: number }[]) {
  return apiMutate<SplitRulesResponse>({
    method: "PATCH",
    path: "/split",
    body: { items },
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
  period: "monthly" | "yearly";
};

export function createGoal(input: GoalCreateInput) {
  return apiMutate<Goal>({ method: "POST", path: "/goals", body: input });
}

export type GoalPatchInput = {
  categoryId?: string | null;
  targetAmount?: number;
  currency?: Currency;
  period?: "monthly" | "yearly";
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

// --- Households -----------------------------------------------------------

export function patchHousehold(id: string, input: { name?: string; baseCurrency?: Currency }) {
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

export function inviteHouseholdMember(householdId: string, email: string) {
  return apiMutate<{ userId: string; householdId: string; role: string; joinedAt: string }>({
    method: "POST",
    path: `/households/${householdId}/members`,
    body: { email },
    householdScoped: false,
  });
}

export function removeHouseholdMember(householdId: string, userId: string) {
  return apiMutate<void>({
    method: "DELETE",
    path: `/households/${householdId}/members/${userId}`,
    householdScoped: false,
  });
}

// --- Categories -----------------------------------------------------------

export type CategoryInput = {
  name: string;
  icon?: string | null;
  color?: string | null;
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
