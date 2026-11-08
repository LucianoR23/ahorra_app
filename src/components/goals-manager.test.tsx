import { render, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { SWRConfig } from "swr";
import { beforeEach, describe, expect, it } from "vitest";
import { swrFetcher } from "@/lib/api/swr-fetcher";
import { API, server, signIn } from "@/test/msw";
import { GoalsManager } from "./goals-manager";

const goal = (over: Record<string, unknown>) => ({
  id: "g1",
  householdId: "h1",
  scope: "household",
  goalType: "total_limit",
  targetAmount: 100,
  currency: "USD",
  period: "monthly",
  isActive: true,
  createdBy: "u1",
  createdAt: "2026-03-01T00:00:00Z",
  updatedAt: "2026-03-01T00:00:00Z",
  ...over,
});

// Progress exactly as the API answers it (0.1): current and targetAmountBase
// in the base currency, targetAmount in the goal's currency, status "ok".
const usdGoal = {
  goal: goal({}),
  periodStart: "2026-03-01",
  periodEnd: "2026-03-31",
  currentAmount: 90000,
  targetAmount: 100,
  targetAmountBase: 150000,
  baseCurrency: "ARS",
  fxRate: 1500,
  percent: 60,
  status: "ok",
};
const weeklyArsGoal = {
  ...usdGoal,
  goal: goal({ id: "g2", currency: "ARS", targetAmount: 50000, period: "weekly" }),
  currentAmount: 10000,
  targetAmount: 50000,
  targetAmountBase: 50000,
  fxRate: null,
  percent: 20,
};

function renderGoals() {
  return render(
    <SWRConfig value={{ fetcher: swrFetcher, provider: () => new Map(), dedupingInterval: 0 }}>
      <GoalsManager />
    </SWRConfig>,
  );
}

beforeEach(() => {
  signIn();
  server.use(
    http.get(`${API}/goals/progress`, () => HttpResponse.json([usdGoal, weeklyArsGoal])),
    http.get(`${API}/categories`, () => HttpResponse.json([])),
    http.get(`${API}/households`, () => HttpResponse.json([{ id: "h1", name: "Casa", baseCurrency: "ARS" }])),
    http.get(`${API}/households/h1/members`, () => HttpResponse.json([])),
  );
});

describe("GoalsManager", () => {
  it("measures a USD goal against its target converted with today's rate, and says so", async () => {
    renderGoals();
    expect(await screen.findByText("$ 150.000")).toBeInTheDocument();
    expect(screen.getByText("US$ 100")).toBeInTheDocument();
    const note = screen.getByText(/Calculado con la cotización de hoy/);
    expect(note).toHaveTextContent("Calculado con la cotización de hoy (1 USD = $ 1.500)");
    expect(screen.getAllByText("En camino")).toHaveLength(2); // status "ok" renders
  });

  it("shows weekly goals as weekly and no rate note for base-currency goals", async () => {
    renderGoals();
    expect(await screen.findByText("$ 50.000")).toBeInTheDocument();
    expect(screen.getByText(/Semanal/)).toBeInTheDocument();
    expect(screen.getAllByText(/Calculado con la cotización de hoy/)).toHaveLength(1);
  });
});
