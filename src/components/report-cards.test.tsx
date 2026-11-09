import { render, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { SWRConfig } from "swr";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { swrFetcher } from "@/lib/api/swr-fetcher";
import { API, server, signIn } from "@/test/msw";
import userEvent from "@testing-library/user-event";
import { AiExportCard } from "./ai-export-card";
import { MonthlyReportCard } from "./monthly-report-card";
import { TrendsReportCard } from "./trends-report-card";

// The trends chart loads lazily (plan 0.14); here it never arrives, so the
// test shows the card doesn't wait for it.
vi.mock("@/components/report-charts-lazy", () => ({
  TrendsLineChart: () => <div data-testid="line-chart" />,
}));

const wrap = (ui: React.ReactNode) =>
  render(<SWRConfig value={{ fetcher: swrFetcher, provider: () => new Map(), dedupingInterval: 0 }}>{ui}</SWRConfig>);

beforeEach(() => signIn());

describe("MonthlyReportCard", () => {
  it("shows the totals, the categories as bars and fixed vs variable", async () => {
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
    expect(screen.getByText(/Gastaste/)).toHaveTextContent("Gastaste $ 1.500");
    expect(screen.getByText("Facturado").closest("div")).toHaveTextContent("$ 1.200");
    expect(screen.getByText("Super")).toBeInTheDocument();
    expect(screen.getAllByTestId("category-bar")).toHaveLength(1);
    expect(screen.getByRole("img", { name: "Fijo 33%, variable 67%" })).toBeInTheDocument();
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
    expect(screen.getByText("marzo 2026", { exact: false })).toBeInTheDocument();
    expect(screen.getByText("Neto").closest("div")).toHaveTextContent("$ 2.100");
    expect(screen.getByText("Ingresos").closest("div")).toHaveTextContent("+ $ 3.000");
  });
});

describe("MonthlyReportCard with nothing by category", () => {
  it("survives the API's null list and hides the empty sections", async () => {
    server.use(
      http.get(`${API}/reports/monthly`, () =>
        HttpResponse.json({
          householdId: "h1",
          baseCurrency: "ARS",
          month: "2026-03",
          from: "2026-03-01",
          to: "2026-03-31",
          spentThisMonth: 0,
          billedThisMonth: 0,
          dueThisMonth: 0,
          byCategory: null,
          fixedVariable: { fixedTotal: 0, variableTotal: 0, fixedPct: 0, variablePct: 0, fixedCount: 0, variableCount: 0 },
        }),
      ),
    );
    wrap(<MonthlyReportCard />);
    expect(await screen.findByText("Gastado")).toBeInTheDocument();
    expect(screen.queryByText("Por categoría")).not.toBeInTheDocument();
    expect(screen.queryByText("Fijo y variable")).not.toBeInTheDocument();
  });
});

describe("AiExportCard", () => {
  it("shows the month's figures and copies the prompt with its data", async () => {
    server.use(
      http.get(`${API}/reports/ai-export`, () =>
        HttpResponse.json({
          householdName: "Mi plata",
          baseCurrency: "ARS",
          month: "2026-03",
          spent: 1500,
          billed: 1200,
          fixedTotal: 500,
          variableTotal: 1000,
          fixedPct: 33.3,
          topCategories: [{ name: "Super", total: 1500, pct: 100, txCount: 3 }],
          prompt: "Gastado: 1500 ARS",
        }),
      ),
    );
    const user = userEvent.setup();
    wrap(<AiExportCard />);
    expect(await screen.findByText("Más gasto en")).toBeInTheDocument();
    expect(screen.getByText("Super 100%")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Copiar" }));
    expect(await screen.findByRole("button", { name: "Copiado" })).toBeInTheDocument();
    expect(await navigator.clipboard.readText()).toContain("Gastado: 1500 ARS");
  });
});
