import { render, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { SWRConfig } from "swr";
import { swrTestConfig } from "@/test/spaces";
import { beforeEach, describe, expect, it, vi } from "vitest";
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
  render(<SWRConfig value={swrTestConfig}>{ui}</SWRConfig>);

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

// Plan 5.4: spending in today's pesos.
describe("reports in today's pesos", () => {
  const trend = (url: URL) => {
    const real = url.searchParams.get("adjust") === "cpi";
    return {
      householdId: "h1",
      baseCurrency: "ARS",
      months: 6,
      ...(real ? { adjust: "cpi", cpiThrough: "2026-09" } : {}),
      points: [
        { month: "2026-03", spentTotal: real ? 1700 : 1500, income: 3000, dueTotal: 900, net: 2100 },
        { month: "2026-10", spentTotal: 800, income: 0, dueTotal: 0, net: 0 },
      ],
    };
  };

  it("a past month shows what was spent in today's pesos", async () => {
    server.use(
      http.get(`${API}/reports/monthly`, () =>
        HttpResponse.json({
          householdId: "h1",
          baseCurrency: "ARS",
          month: "2026-02",
          from: "2026-02-01",
          to: "2026-02-28",
          spentThisMonth: 20000,
          spentRealThisMonth: 22727.27,
          cpiThrough: "2026-09",
          billedThisMonth: 0,
          dueThisMonth: 0,
          byCategory: [],
          fixedVariable: { fixedTotal: 0, variableTotal: 0, fixedPct: 0, variablePct: 0, fixedCount: 0, variableCount: 0 },
        }),
      ),
    );
    wrap(<MonthlyReportCard />);
    const row = (await screen.findByText("En pesos de hoy")).closest("div")!.parentElement!;
    expect(row).toHaveTextContent("$ 22.727");
    expect(row).toHaveTextContent("hasta septiembre 2026");
  });

  it("trends switch to today's pesos and say up to which month", async () => {
    const asked: string[] = [];
    server.use(
      http.get(`${API}/reports/trends`, ({ request }) => {
        const url = new URL(request.url);
        asked.push(url.searchParams.get("adjust") ?? "");
        return HttpResponse.json(trend(url));
      }),
    );
    wrap(<TrendsReportCard />);
    await screen.findByTestId("line-chart");
    expect(screen.queryByText(/con la inflación/)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("radio", { name: "Pesos de hoy" }));
    expect(await screen.findByText(/con la inflación del INDEC hasta septiembre 2026/)).toHaveTextContent(
      "Octubre va sin ajustar: el INDEC todavía no publicó su inflación.",
    );
    expect(asked).toContain("cpi");
  });

  it("names the two months INDEC has not published yet", async () => {
    server.use(
      http.get(`${API}/reports/trends`, ({ request }) => {
        const body = trend(new URL(request.url));
        body.points.push({ month: "2026-11", spentTotal: 300, income: 0, dueTotal: 0, net: 0 });
        return HttpResponse.json(body);
      }),
    );
    wrap(<TrendsReportCard />);
    await userEvent.click(await screen.findByRole("radio", { name: "Pesos de hoy" }));
    expect(await screen.findByText(/Octubre y noviembre van sin ajustar/)).toBeInTheDocument();
  });

  it("a longer gap does not blame INDEC", async () => {
    server.use(
      http.get(`${API}/reports/trends`, ({ request }) => {
        const body = trend(new URL(request.url));
        body.points.push(
          { month: "2026-11", spentTotal: 300, income: 0, dueTotal: 0, net: 0 },
          { month: "2026-12", spentTotal: 300, income: 0, dueTotal: 0, net: 0 },
        );
        return HttpResponse.json(body);
      }),
    );
    wrap(<TrendsReportCard />);
    await userEvent.click(await screen.findByRole("radio", { name: "Pesos de hoy" }));
    expect(await screen.findByText("Desde octubre van sin ajustar hasta que tengamos el dato del INDEC.")).toBeInTheDocument();
  });

  it("without the index it offers the unadjusted view", async () => {
    server.use(
      http.get(`${API}/reports/trends`, ({ request }) => {
        const url = new URL(request.url);
        if (url.searchParams.get("adjust")) {
          return HttpResponse.json({ code: "conflict", message: "Todavía no" }, { status: 409 });
        }
        return HttpResponse.json(trend(url));
      }),
    );
    wrap(<TrendsReportCard />);
    await screen.findByTestId("line-chart");
    await userEvent.click(screen.getByRole("radio", { name: "Pesos de hoy" }));
    await userEvent.click(await screen.findByRole("button", { name: "Ver sin ajustar" }));
    expect(await screen.findByTestId("line-chart")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Sin ajustar" })).toBeChecked();
  });
});
