"use client";

import useSWR from "swr";
import { useAuthStore } from "@/stores/auth";
import { useHouseholdStore } from "@/stores/household";
import type {
  MonthlyReport,
  ExpenseListResponse,
  ExpenseDetail,
  IncomeListResponse,
  Income,
  Insight,
  InsightUnreadCount,
  Household,
  HouseholdMember,
  Category,
  PaymentMethod,
  Bank,
  CreditCard,
  CreditCardPeriod,
  CreditCardPeriodStatus,
  RecurringExpense,
  RecurringIncome,
  Rate,
  BalancesResponse,
  BalancesMeResponse,
  Settlement,
  SplitRulesResponse,
  Goal,
  GoalProgress,
  TrendsReport,
  AiExport,
  AdminDeletedHousehold,
  TotalIncomeResponse,
} from "./schemas";

function useReady() {
  const token = useAuthStore((s) => s.accessToken);
  const householdId = useHouseholdStore((s) => s.currentId);
  return { token, householdId };
}

export function useHouseholds() {
  const token = useAuthStore((s) => s.accessToken);
  return useSWR<Household[]>(
    token ? (["/households", { householdScoped: false }] as const) : null,
  );
}

export function useHouseholdMembers(householdId?: string | null) {
  const token = useAuthStore((s) => s.accessToken);
  const current = useHouseholdStore((s) => s.currentId);
  const id = householdId ?? current;
  return useSWR<HouseholdMember[]>(
    token && id ? ([`/households/${id}/members`, { householdScoped: false }] as const) : null,
  );
}

export function useMonthlyReport(month?: string) {
  const { token, householdId } = useReady();
  const key = token && householdId
    ? (["/reports/monthly", { query: month ? { month } : undefined }] as const)
    : null;
  return useSWR<MonthlyReport>(key);
}

export type ExpenseFilters = {
  categoryId?: string;
  paymentMethodId?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
};

export function useExpenses(filters: ExpenseFilters = {}) {
  const { token, householdId } = useReady();
  const query: Record<string, string | number | undefined> = {};
  if (filters.categoryId) query.categoryId = filters.categoryId;
  if (filters.paymentMethodId) query.paymentMethodId = filters.paymentMethodId;
  if (filters.from) query.from = filters.from;
  if (filters.to) query.to = filters.to;
  query.limit = filters.limit ?? 50;
  query.offset = filters.offset ?? 0;
  const key = token && householdId ? (["/expenses", { query }] as const) : null;
  return useSWR<ExpenseListResponse>(key);
}

export function useRecentExpenses(limit = 5) {
  return useExpenses({ limit });
}

export function useExpense(id: string | null | undefined) {
  const { token, householdId } = useReady();
  const key = token && householdId && id ? ([`/expenses/${id}`] as const) : null;
  return useSWR<ExpenseDetail>(key);
}

export type IncomeFilters = {
  receivedBy?: string;
  paymentMethodId?: string;
  source?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
};

export function useIncomes(filters: IncomeFilters = {}) {
  const { token, householdId } = useReady();
  const query: Record<string, string | number | undefined> = {};
  if (filters.receivedBy) query.receivedBy = filters.receivedBy;
  if (filters.paymentMethodId) query.paymentMethodId = filters.paymentMethodId;
  if (filters.source) query.source = filters.source;
  if (filters.from) query.from = filters.from;
  if (filters.to) query.to = filters.to;
  query.limit = filters.limit ?? 50;
  query.offset = filters.offset ?? 0;
  const key = token && householdId ? (["/incomes", { query }] as const) : null;
  return useSWR<IncomeListResponse>(key);
}

export function useIncome(id: string | null | undefined) {
  const { token, householdId } = useReady();
  const key = token && householdId && id ? ([`/incomes/${id}`] as const) : null;
  return useSWR<Income>(key);
}

export function useRecurringExpenses() {
  const { token, householdId } = useReady();
  const key = token && householdId ? (["/recurring-expenses"] as const) : null;
  return useSWR<RecurringExpense[]>(key);
}

export function useRecurringExpense(id: string | null | undefined) {
  const { token, householdId } = useReady();
  const key = token && householdId && id ? ([`/recurring-expenses/${id}`] as const) : null;
  return useSWR<RecurringExpense>(key);
}

export function useRecurringIncomes() {
  const { token, householdId } = useReady();
  const key = token && householdId ? (["/recurring-incomes"] as const) : null;
  return useSWR<RecurringIncome[]>(key);
}

export function useRecurringIncome(id: string | null | undefined) {
  const { token, householdId } = useReady();
  const key = token && householdId && id ? ([`/recurring-incomes/${id}`] as const) : null;
  return useSWR<RecurringIncome>(key);
}

export function useTotalIncome(range: { from?: string; to?: string } = {}) {
  const { token, householdId } = useReady();
  const query: Record<string, string | number | undefined> = {};
  if (range.from) query.from = range.from;
  if (range.to) query.to = range.to;
  const key = token && householdId
    ? (["/totals/income", Object.keys(query).length ? { query } : {}] as const)
    : null;
  return useSWR<TotalIncomeResponse>(key);
}

export type InsightFilters = {
  userId?: string;
  unread?: boolean;
  from?: string;
  to?: string;
  type?: string;
  limit?: number;
  offset?: number;
};

export function useInsights(filters: InsightFilters = {}) {
  const { token, householdId } = useReady();
  const query: Record<string, string | number | undefined> = {};
  if (filters.userId) query.userId = filters.userId;
  if (typeof filters.unread === "boolean") query.unread = filters.unread ? "true" : "false";
  if (filters.from) query.from = filters.from;
  if (filters.to) query.to = filters.to;
  if (filters.type) query.type = filters.type;
  if (typeof filters.limit === "number") query.limit = filters.limit;
  if (typeof filters.offset === "number") query.offset = filters.offset;
  const key = token && householdId ? (["/insights", { query }] as const) : null;
  return useSWR<Insight[]>(key);
}

export function useLatestInsight() {
  return useInsights({ limit: 1 });
}

export function useInsight(id: string | null | undefined) {
  const { token, householdId } = useReady();
  const key = token && householdId && id ? ([`/insights/${id}`] as const) : null;
  return useSWR<Insight>(key);
}

export function useInsightsUnreadCount(userId?: string | null) {
  const { token, householdId } = useReady();
  const query: Record<string, string | number | undefined> = {};
  if (userId) query.userId = userId;
  const key = token && householdId
    ? (["/insights/unread-count", Object.keys(query).length ? { query } : {}] as const)
    : null;
  return useSWR<InsightUnreadCount>(key, {
    // Polling de fallback. El refresh real lo hace useInsightsRealtime via
    // SSE: ante cada `insight.created` se invalida esta key. Bajamos a 5min
    // para cubrir caso de SSE caído / proxy que corta conexiones largas.
    refreshInterval: 300_000,
    revalidateOnFocus: true,
  });
}

export function useCategories() {
  const { token, householdId } = useReady();
  const key = token && householdId ? (["/categories"] as const) : null;
  return useSWR<Category[]>(key);
}

export function usePaymentMethods(opts?: { includeInactive?: boolean }) {
  const token = useAuthStore((s) => s.accessToken);
  const path = opts?.includeInactive
    ? "/payment-methods?includeInactive=true"
    : "/payment-methods";
  return useSWR<PaymentMethod[]>(
    token ? ([path, { householdScoped: false }] as const) : null,
  );
}

export function useBanks() {
  const token = useAuthStore((s) => s.accessToken);
  return useSWR<Bank[]>(
    token ? (["/banks", { householdScoped: false }] as const) : null,
  );
}

export function useCreditCard(paymentMethodId: string | null | undefined) {
  const token = useAuthStore((s) => s.accessToken);
  return useSWR<CreditCard>(
    token && paymentMethodId
      ? ([`/payment-methods/${paymentMethodId}/credit-card`, { householdScoped: false }] as const)
      : null,
  );
}

export function useCreditCardPeriods(paymentMethodId: string | null | undefined) {
  const token = useAuthStore((s) => s.accessToken);
  return useSWR<CreditCardPeriod[]>(
    token && paymentMethodId
      ? ([`/payment-methods/${paymentMethodId}/credit-card/periods`, { householdScoped: false }] as const)
      : null,
  );
}

export function useBalances() {
  const { token, householdId } = useReady();
  const key = token && householdId ? (["/balances"] as const) : null;
  return useSWR<BalancesResponse>(key);
}

export function useBalancesMe() {
  const { token, householdId } = useReady();
  const key = token && householdId ? (["/balances/me"] as const) : null;
  return useSWR<BalancesMeResponse>(key);
}

export type SettlementsFilters = {
  fromUser?: string;
  toUser?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
};

export function useSettlements(filters: SettlementsFilters = {}) {
  const { token, householdId } = useReady();
  const query: Record<string, string | number | undefined> = {};
  if (filters.fromUser) query.fromUser = filters.fromUser;
  if (filters.toUser) query.toUser = filters.toUser;
  if (filters.from) query.from = filters.from;
  if (filters.to) query.to = filters.to;
  query.limit = filters.limit ?? 50;
  query.offset = filters.offset ?? 0;
  const key = token && householdId ? (["/settlements", { query }] as const) : null;
  return useSWR<{ items: Settlement[] }>(key);
}

export function useSplitRules() {
  const { token, householdId } = useReady();
  const key = token && householdId ? (["/split"] as const) : null;
  return useSWR<SplitRulesResponse>(key);
}

export type GoalsFilters = {
  scope?: "household" | "user";
  userId?: string;
  active?: boolean;
};

export function useGoals(filters: GoalsFilters = {}) {
  const { token, householdId } = useReady();
  const query: Record<string, string | number | undefined> = {};
  if (filters.scope) query.scope = filters.scope;
  if (filters.userId) query.userId = filters.userId;
  if (typeof filters.active === "boolean") query.active = filters.active ? "true" : "false";
  const key = token && householdId ? (["/goals", { query }] as const) : null;
  return useSWR<Goal[]>(key);
}

export function useGoalsProgress(filters: GoalsFilters & { at?: string } = {}) {
  const { token, householdId } = useReady();
  const query: Record<string, string | number | undefined> = {};
  if (filters.scope) query.scope = filters.scope;
  if (filters.userId) query.userId = filters.userId;
  if (typeof filters.active === "boolean") query.active = filters.active ? "true" : "false";
  if (filters.at) query.at = filters.at;
  const key = token && householdId ? (["/goals/progress", { query }] as const) : null;
  return useSWR<GoalProgress[]>(key);
}

export function useGoal(id: string | null | undefined) {
  const { token, householdId } = useReady();
  const key = token && householdId && id ? ([`/goals/${id}`] as const) : null;
  return useSWR<Goal>(key);
}

export function useGoalProgress(id: string | null | undefined, at?: string) {
  const { token, householdId } = useReady();
  const query: Record<string, string | undefined> = {};
  if (at) query.at = at;
  const key = token && householdId && id
    ? ([`/goals/${id}/progress`, Object.keys(query).length ? { query } : {}] as const)
    : null;
  return useSWR<GoalProgress>(key);
}

export function useSettlement(id: string | null | undefined) {
  const { token, householdId } = useReady();
  const key = token && householdId && id ? ([`/settlements/${id}`] as const) : null;
  return useSWR<Settlement>(key);
}

export function useExchangeRates() {
  const token = useAuthStore((s) => s.accessToken);
  return useSWR<Rate[]>(
    token ? (["/exchange-rates/current", { householdScoped: false }] as const) : null,
  );
}

export function useHousehold(id?: string | null) {
  const token = useAuthStore((s) => s.accessToken);
  return useSWR<Household>(
    token && id ? ([`/households/${id}`, { householdScoped: false }] as const) : null,
  );
}

export function useTrendsReport(months = 6) {
  const { token, householdId } = useReady();
  const key = token && householdId
    ? (["/reports/trends", { query: { months } }] as const)
    : null;
  return useSWR<TrendsReport>(key);
}

export function useAiExport(month?: string) {
  const { token, householdId } = useReady();
  const key = token && householdId && month
    ? (["/reports/ai-export", { query: { month } }] as const)
    : null;
  return useSWR<AiExport>(key);
}

export function useCreditCardPeriodStatus(paymentMethodId?: string | null) {
  const token = useAuthStore((s) => s.accessToken);
  return useSWR<CreditCardPeriodStatus>(
    token && paymentMethodId
      ? ([`/payment-methods/${paymentMethodId}/credit-card/periods/status`, { householdScoped: false }] as const)
      : null,
  );
}

export function useHouseholdInvites(householdId?: string | null) {
  const token = useAuthStore((s) => s.accessToken);
  const current = useHouseholdStore((s) => s.currentId);
  const id = householdId ?? current;
  return useSWR<
    {
      id: string;
      householdId: string;
      email: string;
      invitedBy: string;
      expiresAt: string;
      createdAt: string;
      status: "pending" | "accepted" | "revoked" | "expired";
    }[]
  >(
    token && id ? ([`/households/${id}/invites`, { householdScoped: false }] as const) : null,
  );
}

export function useAdminDeletedHouseholds(enabled = true) {
  const token = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const canQuery = !!token && !!user?.isSuperadmin && enabled;
  return useSWR<AdminDeletedHousehold[]>(
    canQuery
      ? (["/admin/households/deleted", { householdScoped: false }] as const)
      : null,
  );
}

export function usePushSubscriptions() {
  const token = useAuthStore((s) => s.accessToken);
  return useSWR<
    {
      id: string;
      endpoint: string;
      userAgent?: string;
      createdAt: string;
      lastSeenAt: string;
    }[]
  >(token ? (["/push/subscriptions", { householdScoped: false }] as const) : null);
}
