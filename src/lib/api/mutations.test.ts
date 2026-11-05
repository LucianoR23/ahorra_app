import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it } from "vitest";
import { API, lastRequest, server, signIn } from "@/test/msw";
import * as m from "./mutations";

const user = { id: "u1", email: "ana@example.test", firstName: "Ana", lastName: "Test", isSuperadmin: false };

beforeEach(() => {
  signIn({ token: "tk", householdId: "h1" });
  server.use(
    http.patch(`${API}/me`, () => HttpResponse.json(user)),
    http.all(`${API}/*`, () => HttpResponse.json({})),
  );
});

// [call, method, path, household scoped, body (JSON) when relevant]
type Row = [string, () => Promise<unknown>, string, string, boolean, unknown?];

const rows: Row[] = [
  ["createExpense", () => m.createExpense({ amount: 1 } as never), "POST", "/expenses", true, { amount: 1 }],
  ["patchExpense", () => m.patchExpense("e1", { description: "x" }), "PATCH", "/expenses/e1", true, { description: "x" }],
  ["deleteExpense", () => m.deleteExpense("e1"), "DELETE", "/expenses/e1", true],
  ["confirmDraftExpense", () => m.confirmDraftExpense("e1", 120), "POST", "/expenses/e1/confirm", true, { amount: 120 }],
  ["createIncome", () => m.createIncome({ amount: 1 } as never), "POST", "/incomes", true],
  ["patchIncome", () => m.patchIncome("i1", {} as never), "PATCH", "/incomes/i1", true],
  ["deleteIncome", () => m.deleteIncome("i1"), "DELETE", "/incomes/i1", true],
  ["createRecurringExpense", () => m.createRecurringExpense({} as never), "POST", "/recurring-expenses", true],
  ["patchRecurringExpense", () => m.patchRecurringExpense("r1", {}), "PATCH", "/recurring-expenses/r1", true],
  ["toggleRecurringExpense", () => m.toggleRecurringExpense("r1", false), "PATCH", "/recurring-expenses/r1/active", true, { isActive: false }],
  ["deleteRecurringExpense", () => m.deleteRecurringExpense("r1"), "DELETE", "/recurring-expenses/r1", true],
  ["createRecurringIncome", () => m.createRecurringIncome({} as never), "POST", "/recurring-incomes", true],
  ["patchRecurringIncome", () => m.patchRecurringIncome("r1", {}), "PATCH", "/recurring-incomes/r1", true],
  ["toggleRecurringIncome", () => m.toggleRecurringIncome("r1", true), "PATCH", "/recurring-incomes/r1/active", true, { isActive: true }],
  ["deleteRecurringIncome", () => m.deleteRecurringIncome("r1"), "DELETE", "/recurring-incomes/r1", true],
  ["createSettlement", () => m.createSettlement({} as never), "POST", "/settlements", true],
  ["deleteSettlement", () => m.deleteSettlement("s1"), "DELETE", "/settlements/s1", true],
  ["patchSplitRules", () => m.patchSplitRules([{ userId: "u1", weight: 2 }]), "PATCH", "/split", true, { items: [{ userId: "u1", weight: 2 }] }],
  ["createGoal", () => m.createGoal({} as never), "POST", "/goals", true],
  ["patchGoal", () => m.patchGoal("g1", {} as never), "PATCH", "/goals/g1", true],
  ["toggleGoal", () => m.toggleGoal("g1", false), "PATCH", "/goals/g1/active", true, { isActive: false }],
  ["deleteGoal", () => m.deleteGoal("g1"), "DELETE", "/goals/g1", true],
  ["createBank", () => m.createBank("Galicia"), "POST", "/banks", false, { name: "Galicia" }],
  ["patchBank", () => m.patchBank("b1", "BBVA"), "PATCH", "/banks/b1", false, { name: "BBVA" }],
  ["activateBank", () => m.activateBank("b1"), "POST", "/banks/b1/activate", false],
  ["deactivateBank", () => m.deactivateBank("b1"), "POST", "/banks/b1/deactivate", false],
  ["createPaymentMethod", () => m.createPaymentMethod({} as never), "POST", "/payment-methods", false],
  ["patchPaymentMethod", () => m.patchPaymentMethod("p1", {} as never), "PATCH", "/payment-methods/p1", false],
  ["activatePaymentMethod", () => m.activatePaymentMethod("p1"), "POST", "/payment-methods/p1/activate", false],
  ["deactivatePaymentMethod", () => m.deactivatePaymentMethod("p1"), "POST", "/payment-methods/p1/deactivate", false],
  ["patchCreditCard", () => m.patchCreditCard("p1", { alias: "Visa" }), "PATCH", "/payment-methods/p1/credit-card", false, { alias: "Visa" }],
  ["upsertCreditCardPeriod", () => m.upsertCreditCardPeriod("p1", "2026-03", { closingDate: "2026-03-26", dueDate: "2026-04-07" }),
    "PUT", "/payment-methods/p1/credit-card/periods/2026-03", false, { closingDate: "2026-03-26", dueDate: "2026-04-07" }],
  ["deleteCreditCardPeriod", () => m.deleteCreditCardPeriod("p1", "2026-03"), "DELETE", "/payment-methods/p1/credit-card/periods/2026-03", false],
  ["createHousehold", () => m.createHousehold({ name: "Casa", baseCurrency: "ARS" }), "POST", "/households", false],
  ["patchHousehold", () => m.patchHousehold("h9", { name: "Casa" }), "PATCH", "/households/h9", false],
  ["deleteHousehold", () => m.deleteHousehold("h9"), "DELETE", "/households/h9", false],
  ["removeHouseholdMember", () => m.removeHouseholdMember("h9", "u2"), "DELETE", "/households/h9/members/u2", false],
  ["transferHouseholdOwnership", () => m.transferHouseholdOwnership("h9", "u2"), "PATCH", "/households/h9/members/u2/role", false, { role: "owner" }],
  ["createHouseholdInvite", () => m.createHouseholdInvite("h9", "b@c.d"), "POST", "/households/h9/invites", false, { email: "b@c.d" }],
  ["revokeHouseholdInvite", () => m.revokeHouseholdInvite("inv1"), "DELETE", "/households/invites/inv1", false],
  ["resendHouseholdInvite", () => m.resendHouseholdInvite("inv1"), "POST", "/households/invites/inv1/resend", false],
  ["acceptInvite", () => m.acceptInvite("tok"), "POST", "/invites/accept", false, { token: "tok" }],
  ["patchMe", () => m.patchMe({ firstName: "Ana" }), "PATCH", "/me", false, { firstName: "Ana" }],
  ["deleteMe", () => m.deleteMe(), "DELETE", "/me", false],
  ["listPushSubscriptions", () => m.listPushSubscriptions(), "GET", "/push/subscriptions", false],
  ["deletePushSubscriptionById", () => m.deletePushSubscriptionById("s1"), "DELETE", "/push/subscriptions/s1", false],
  ["listAdminDeletedHouseholds", () => m.listAdminDeletedHouseholds(), "GET", "/admin/households/deleted", false],
  ["getAdminHousehold", () => m.getAdminHousehold("h9"), "GET", "/admin/households/h9", false],
  ["restoreAdminHousehold", () => m.restoreAdminHousehold("h9"), "POST", "/admin/households/h9/restore", false],
  ["purgeAdminHousehold", () => m.purgeAdminHousehold("h9"), "DELETE", "/admin/households/h9/purge", false],
  ["markInsightRead", () => m.markInsightRead("n1"), "POST", "/insights/n1/read", true],
  ["deleteInsight", () => m.deleteInsight("n1"), "DELETE", "/insights/n1", true],
  ["createCategory", () => m.createCategory({ name: "Mascotas" } as never), "POST", "/categories", true],
  ["patchCategory", () => m.patchCategory("c1", { name: "Perro" } as never), "PATCH", "/categories/c1", true],
  ["deleteCategory", () => m.deleteCategory("c1"), "DELETE", "/categories/c1", true],
];

describe("mutation wrappers", () => {
  it.each(rows)("%s → %s %s", async (_name, call, method, path, scoped, body) => {
    await call();
    const r = lastRequest();
    expect(r.method).toBe(method);
    expect(r.path).toBe(path);
    expect(r.headers.get("authorization")).toBe("Bearer tk");
    expect(r.headers.get("x-household-id")).toBe(scoped ? "h1" : null);
    if (body !== undefined) {
      await expect.poll(() => (r.body ? JSON.parse(r.body) : undefined)).toEqual(body);
    }
  });

  it("markAllInsightsRead and generateInsights pass optional query params", async () => {
    await m.markAllInsightsRead("u2");
    expect(lastRequest()).toMatchObject({ path: "/insights/mark-all-read", query: { userId: "u2" } });
    await m.markAllInsightsRead();
    expect(lastRequest().query).toEqual({});
    await m.generateInsights("2026-03-15");
    expect(lastRequest()).toMatchObject({ path: "/insights/generate", query: { at: "2026-03-15" } });
  });

  it("getInvitePreview is public and encodes the token", async () => {
    await m.getInvitePreview("a/b c");
    expect(lastRequest().path).toBe("/invites/a%2Fb%20c");
  });

  it("adminSendTestPush posts to the admin endpoint", async () => {
    await m.adminSendTestPush();
    expect(lastRequest()).toMatchObject({ method: "POST", path: "/admin/push/test" });
  });
});

describe("patchInstallment builds a tri-state body", () => {
  const body = async () => {
    const r = lastRequest();
    await expect.poll(() => r.body).not.toBe("");
    return JSON.parse(r.body);
  };

  it("omits what was not given", async () => {
    await m.patchInstallment("e1", 2, { isPaid: true });
    expect(lastRequest().path).toBe("/expenses/e1/installments/2");
    expect(await body()).toEqual({ isPaid: true });
  });

  it("sends null to clear and a value to set", async () => {
    await m.patchInstallment("e1", 2, { dueDate: null, billingDate: "2026-03-01" });
    expect(await body()).toEqual({ dueDate: null, billingDate: "2026-03-01" });
  });
});

describe("patchMe", () => {
  it("validates the returned user", async () => {
    await expect(m.patchMe({ firstName: "Ana" })).resolves.toMatchObject({ id: "u1", firstName: "Ana" });
    server.use(http.patch(`${API}/me`, () => HttpResponse.json({ id: "u1" })));
    await expect(m.patchMe({ firstName: "Ana" })).rejects.toThrow();
  });
});

describe("contract with the API (audit section 10)", () => {
  // Bug 8: typed as returning the member, but the API answers 204 with no body.
  it.fails("transferHouseholdOwnership resolves to the HouseholdMember its type promises", async () => {
    server.use(http.patch(`${API}/households/h9/members/u2/role`, () => new HttpResponse(null, { status: 204 })));
    const member = await m.transferHouseholdOwnership("h9", "u2");
    expect(member).toHaveProperty("role", "owner");
  });
});
