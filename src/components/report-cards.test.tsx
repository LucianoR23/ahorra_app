import { render, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { SWRConfig } from "swr";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { swrFetcher } from "@/lib/api/swr-fetcher";
import { API, server, signIn } from "@/test/msw";
import { MonthlyReportCard } from "./monthly-report-card";
import { TrendsReportCard } from "./trends-report-card";

// The charts load lazily (plan 0.14); here they never arrive, so the test
// shows the cards don't wait for them.
vi.mock("@/components/report-charts-lazy", () => ({
  CategoryBarChart: () => <div data-testid="bar-chart" />,
  DonutChart: () => <div data-testid="donut-chart" />,
  TrendsLineChart: () => <div data-testid="line-chart" />,
}));

const wrap = (ui: React.ReactNode) =>
  render(<SWRConfig value={{ fetcher: swrFetcher, provider: () => new Map(), dedupingInterval: 0 }}>{ui}</SWRConfig>);

beforeEach(() => signIn());

describe("MonthlyReportCard", () => {
  it("shows the totals, the category legend and both charts", async () => {
    server.use(
      http.get(`${API}/reports/monthly`, () =>
        HttpResponse.json({
          householdId: "h1",
          baseCurrency: "ARS",
          month: "2026-03",
          from: "2026-03-01",
          to: "2026-03-31",
          spentThisMonth: 1500,
          billedThisMonth: 1200,
          dueThisMonth: 900,
          byCategory: [{ categoryId: "c1", categoryName: "Super", total: 1500, pct: 100, txCount: 3 }],
          fixedVariable: { fixedTotal: 500, variableTotal: 1000, fixedPct: 33.3, variablePct: 66.7, fixedCount: 1, variableCount: 2 },
        }),
      ),
    );
    wrap(<MonthlyReportCard />);
    expect(await screen.findByText("Gastado")).toBeInTheDocument();
    expect(screen.getByText("Super")).toBeInTheDocument();
    expect(screen.getByText("66.7%")).toBeInTheDocument();
    expect(screen.getByTestId("bar-chart")).toBeInTheDocument();
    expect(screen.getByTestId("donut-chart")).toBeInTheDocument();
  });
});

describe("TrendsReportCard", () => {
  it("shows the chart and the last month's figures", async () => {
    server.use(
      http.get(`${API}/reports/trends`, () =>
        HttpResponse.json({
          householdId: "h1",
          baseCurrency: "ARS",
          months: 6,
          points: [{ month: "2026-03", spentTotal: 1500, income: 3000, dueTotal: 900, net: 2100 }],
        }),
      ),
    );
    wrap(<TrendsReportCard />);
    expect(await screen.findByTestId("line-chart")).toBeInTheDocument();
    expect(screen.getByText("Neto (último mes)")).toBeInTheDocument();
  });
});
