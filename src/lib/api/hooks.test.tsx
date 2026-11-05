import { renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { SWRConfig } from "swr";
import { beforeEach, describe, expect, it } from "vitest";
import { useAuthStore } from "@/stores/auth";
import { API, requests, server, signIn, signOut } from "@/test/msw";
import * as h from "./hooks";
import { swrFetcher } from "./swr-fetcher";

// Same fetcher as the app's providers, with a fresh cache per test.
function wrapper({ children }: { children: ReactNode }) {
  return (
    <SWRConfig value={{ fetcher: swrFetcher, provider: () => new Map(), dedupingInterval: 0, revalidateOnFocus: false }}>
      {children}
    </SWRConfig>
  );
}

beforeEach(() => {
  signIn({ token: "tk", householdId: "h1" });
  server.use(http.get(`${API}/*`, () => HttpResponse.json({})));
});

// [hook, call, path, query, household scoped]
type Row = [string, () => unknown, string, Record<string, string>, boolean];

const rows: Row[] = [
  ["useHouseholds", () => h.useHouseholds(), "/households", {}, false],
  ["useHouseholdMembers", () => h.useHouseholdMembers(), "/households/h1/members", {}, false],
  ["useHouseholdMembers(id)", () => h.useHouseholdMembers("h9"), "/households/h9/members", {}, false],
  ["useMonthlyReport", () => h.useMonthlyReport("2026-03"), "/reports/monthly", { month: "2026-03" }, true],
  ["useExpenses", () => h.useExpenses({ categoryId: "c1", q: "super", from: "2026-01-01" }), "/expenses",
    { categoryId: "c1", q: "super", from: "2026-01-01", limit: "50", offset: "0" }, true],
  ["useRecentExpenses", () => h.useRecentExpenses(3), "/expenses", { limit: "3", offset: "0" }, true],
  ["useExpense", () => h.useExpense("e1"), "/expenses/e1", {}, true],
  ["useIncomes", () => h.useIncomes({ source: "salary" }), "/incomes", { source: "salary", limit: "50", offset: "0" }, true],
  ["useIncome", () => h.useIncome("i1"), "/incomes/i1", {}, true],
  ["useRecurringExpenses", () => h.useRecurringExpenses(), "/recurring-expenses", {}, true],
  ["useRecurringExpense", () => h.useRecurringExpense("r1"), "/recurring-expenses/r1", {}, true],
  ["useDraftExpenses", () => h.useDraftExpenses(), "/expenses/drafts", {}, true],
  ["useSeriesStats", () => h.useSeriesStats("r1"), "/recurring-expenses/r1/stats", { limit: "6" }, true],
  ["useRecurringIncomes", () => h.useRecurringIncomes(), "/recurring-incomes", {}, true],
  ["useRecurringIncome", () => h.useRecurringIncome("r1"), "/recurring-incomes/r1", {}, true],
  ["useTotalIncome", () => h.useTotalIncome({ from: "2026-03-01" }), "/totals/income", { from: "2026-03-01" }, true],
  ["useInsights", () => h.useInsights({ unread: true, limit: 10 }), "/insights", { unread: "true", limit: "10" }, true],
  ["useInsight", () => h.useInsight("n1"), "/insights/n1", {}, true],
  ["useInsightsUnreadCount", () => h.useInsightsUnreadCount("u1"), "/insights/unread-count", { userId: "u1" }, true],
  ["useCategories", () => h.useCategories(), "/categories", {}, true],
  ["usePaymentMethods", () => h.usePaymentMethods(), "/payment-methods", {}, false],
  ["useBanks", () => h.useBanks(), "/banks", {}, false],
  ["useCreditCard", () => h.useCreditCard("p1"), "/payment-methods/p1/credit-card", {}, false],
  ["useCreditCardPeriods", () => h.useCreditCardPeriods("p1"), "/payment-methods/p1/credit-card/periods", {}, false],
  ["useBalances", () => h.useBalances(), "/balances", {}, true],
  ["useBalancesMe", () => h.useBalancesMe(), "/balances/me", {}, true],
  ["useSettlements", () => h.useSettlements({ withUser: "u2" }), "/settlements", { withUser: "u2", limit: "50", offset: "0" }, true],
  ["useSplitRules", () => h.useSplitRules(), "/split", {}, true],
  ["useGoalsProgress", () => h.useGoalsProgress({ at: "2026-03-15" }), "/goals/progress", { at: "2026-03-15" }, true],
  ["useGoalProgress", () => h.useGoalProgress("g1", "2026-03-15"), "/goals/g1/progress", { at: "2026-03-15" }, true],
  ["useSettlement", () => h.useSettlement("s1"), "/settlements/s1", {}, true],
  ["useExchangeRates", () => h.useExchangeRates(), "/exchange-rates/current", {}, false],
  ["useTrendsReport", () => h.useTrendsReport(12), "/reports/trends", { months: "12" }, true],
  ["useAiExport", () => h.useAiExport("2026-03"), "/reports/ai-export", { month: "2026-03" }, true],
  ["useHouseholdInvites", () => h.useHouseholdInvites("h9"), "/households/h9/invites", {}, false],
  ["usePushSubscriptions", () => h.usePushSubscriptions(), "/push/subscriptions", {}, false],
];

describe("SWR hooks", () => {
  it.each(rows)("%s", async (_name, call, path, query, scoped) => {
    const { result } = renderHook(call, { wrapper });
    await waitFor(() => expect((result.current as { data?: unknown }).data).toBeDefined());
    const r = requests().find((x) => x.path === path);
    expect(r, `no GET ${path}; saw ${requests().map((x) => x.path).join(", ")}`).toBeDefined();
    expect(r?.query).toEqual(query);
    expect(r?.headers.get("x-household-id")).toBe(scoped ? "h1" : null);
  });

  it("the superadmin list is only fetched for superadmins", async () => {
    renderHook(() => h.useAdminDeletedHouseholds(), { wrapper });
    await new Promise((r) => setTimeout(r, 50));
    expect(requests()).toHaveLength(0);

    signIn();
    useAuthStore.setState((st) => ({ user: st.user && { ...st.user, isSuperadmin: true } }));
    const { result } = renderHook(() => h.useAdminDeletedHouseholds(), { wrapper });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(requests().map((r) => r.path)).toContain("/admin/households/deleted");
  });

  it("household reads wait for a selected household", async () => {
    signIn({ householdId: null });
    const { result } = renderHook(() => h.useCategories(), { wrapper });
    await new Promise((r) => setTimeout(r, 50));
    expect(result.current.data).toBeUndefined();
    expect(requests()).toHaveLength(0);
  });

  it("nothing is fetched without a session", async () => {
    signOut();
    renderHook(() => [h.useHouseholds(), h.useBanks(), h.useExpenses()], { wrapper });
    await new Promise((r) => setTimeout(r, 50));
    expect(requests()).toHaveLength(0);
  });

  it("id-based hooks wait for an id", async () => {
    renderHook(() => [h.useExpense(null), h.useIncome(undefined), h.useCreditCard(null)], { wrapper });
    await new Promise((r) => setTimeout(r, 50));
    expect(requests()).toHaveLength(0);
  });
});
