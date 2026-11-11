import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InicioYo } from "./inicio-yo";
import type { Committed } from "@/lib/api/schemas";
import { API, server, signIn } from "@/test/msw";
import { STORAGE_KEYS } from "@/lib/storage-keys";
import { useViewCurrencyStore } from "@/stores/view-currency";
import { personalSpace, WithSWR } from "@/test/spaces";

// Inicio · Yo (designs `Main` and `DesktopInicio`, plan 4.2).

vi.mock("@/components/install-prompt", () => ({ InstallPrompt: () => null }));
vi.mock("@/components/push-provider", () => ({ PushProvider: () => null }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), push: vi.fn() }), usePathname: () => "/" }));

const page = (items: unknown[]) => ({ items, totalCount: items.length, limit: 5, offset: 0 });

const committed: Committed = {
  months: [
    { periodYm: "2026-12", totals: [{ currency: "ARS", amount: 214800 }] },
    { periodYm: "2027-01", totals: [{ currency: "ARS", amount: 168400 }] },
  ],
  cards: [
    {
      paymentMethodId: "visa",
      name: "Visa",
      alias: "Visa",
      network: "visa",
      lastFour: "4417",
      openPeriodYm: "2026-12",
      toPay: {
        periodYm: "2026-11",
        closingDate: "2026-11-24",
        dueDate: "2026-12-03",
        status: "closed",
        totals: [{ currency: "ARS", amount: 312400 }],
        installmentCount: 4,
        minimumPayment: null,
        paidAt: null,
        paidAmount: null,
        paidCurrency: null,
      },
      months: [],
    },
    {
      paymentMethodId: "master",
      name: "Mastercard",
      alias: "Master",
      network: "mastercard",
      lastFour: null,
      openPeriodYm: "2026-12",
      toPay: null,
      months: [],
    },
  ],
};

const expense = {
  id: "e1",
  householdId: personalSpace.id,
  createdBy: "u1",
  categoryId: "c1",
  paymentMethodId: "visa",
  amount: 89990,
  currency: "ARS",
  amountBase: 89990,
  baseCurrency: "ARS",
  description: "Heladera",
  spentAt: "2026-11-02",
  installments: 12,
  isShared: false,
  status: "confirmed",
  createdAt: "2026-11-02T00:00:00Z",
  updatedAt: "2026-11-02T00:00:00Z",
};

function handlers({ income = 1151143, spent = 486320, cards = committed } = {}) {
  server.use(
    http.get(`${API}/households`, () => HttpResponse.json([personalSpace])),
    http.get(`${API}/reports/monthly`, ({ request }) => {
      const q = new URL(request.url).searchParams;
      // Plan 5.3: in dollars at $ 1.600, or $ 2.000 for "today".
      const usd = q.get("currency") === "USD";
      const rate = q.get("rate") === "today" ? 2000 : 1600;
      const amount = (n: number) => (usd ? Math.round((n / rate) * 100) / 100 : n);
      return HttpResponse.json({
        householdId: personalSpace.id,
        baseCurrency: "ARS",
        ...(usd ? { currency: "USD", rateSource: "bolsa", rateMode: q.get("rate") ?? "day", usdRate: 2000 } : { currency: "ARS" }),
        month: "2026-11",
        from: "2026-11-01",
        to: "2026-11-30",
        spentThisMonth: amount(spent),
        incomeThisMonth: amount(income),
        billedThisMonth: 0,
        dueThisMonth: 0,
        byCategory: [],
        fixedVariable: { fixedTotal: 0, variableTotal: 0, fixedPct: 0, variablePct: 0, fixedCount: 0, variableCount: 0 },
      });
    }),
    http.get(`${API}/credit-cards/committed`, () => HttpResponse.json(cards)),
    http.get(`${API}/insights`, () =>
      HttpResponse.json(
        page([
          {
            id: "i1",
            householdId: personalSpace.id,
            insightDate: "2026-11-08",
            insightType: "weekly_review",
            title: "Tu semana",
            body: "Gastaste 18% más en delivery.",
            severity: "info",
            isRead: false,
            createdAt: "2026-11-08T00:00:00Z",
          },
        ]),
      ),
    ),
    http.get(`${API}/insights/unread-count`, () => HttpResponse.json({ unread: 0 })),
    http.get(`${API}/expenses`, () => HttpResponse.json(page([expense]))),
    http.get(`${API}/expenses/drafts`, () => HttpResponse.json([])),
    http.get(`${API}/categories`, () =>
      HttpResponse.json([{ id: "c1", householdId: personalSpace.id, name: "Hogar", icon: "home", color: null, parentId: null }]),
    ),
    http.get(`${API}/payment-methods`, () =>
      HttpResponse.json([
        { id: "visa", ownerUserId: "u1", name: "Visa", kind: "credit", allowsInstallments: true, isActive: true, createdAt: "" },
      ]),
    ),
  );
}

beforeEach(() => signIn({ householdId: personalSpace.id }));

describe("InicioYo", () => {
  it("shows the month, what came in and what is left", async () => {
    handlers();
    render(<InicioYo />, { wrapper: WithSWR });
    const hero = await screen.findByRole("region", { name: /Gastaste en/ });
    expect(await within(hero).findByText("$ 486.320")).toBeInTheDocument();
    expect(await within(hero).findByText("+ $ 1.151.143")).toBeInTheDocument();
    expect(within(hero).getByText("Te quedan")).toBeInTheDocument();
    expect(within(hero).getByText("$ 664.823")).toBeInTheDocument();
    expect(within(hero).getByText("Gastaste el 42% de lo que entró este mes.")).toBeInTheDocument();
  });

  it("switches to dollars and back (plan 5.3)", async () => {
    useViewCurrencyStore.setState({ currency: "ARS", today: false });
    handlers();
    render(<InicioYo />, { wrapper: WithSWR });
    const hero = await screen.findByRole("region", { name: /Gastaste en/ });
    expect(await within(hero).findByText("$ 486.320")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("combobox", { name: "Ver montos en" }));
    await userEvent.click(await screen.findByRole("option", { name: "Dólares" }));
    expect(await within(hero).findByText("US$ 303,95")).toBeInTheDocument();
    expect(within(hero).getByText("+ US$ 719,46")).toBeInTheDocument();
    expect(within(hero).getByText(/al dólar MEP del día de cada movimiento\. Tarjetas y deudas siguen en pesos\./)).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.viewCurrency) ?? "{}")).toMatchObject({ state: { currency: "USD" } });

    await userEvent.click(within(hero).getByRole("button", { name: "Usar el de hoy" }));
    expect(await within(hero).findByText("US$ 243,16")).toBeInTheDocument();
    expect(within(hero).getByText(/al dólar MEP de hoy, a/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("combobox", { name: "Ver montos en" }));
    await userEvent.click(await screen.findByRole("option", { name: "Pesos" }));
    expect(await within(hero).findByText("$ 486.320")).toBeInTheDocument();
    useViewCurrencyStore.setState({ currency: "ARS", today: false });
  });

  it("says when the month went over what came in", async () => {
    handlers({ income: 100000, spent: 150000 });
    render(<InicioYo />, { wrapper: WithSWR });
    expect(await screen.findByText("Te pasaste")).toBeInTheDocument();
    expect(await screen.findByText("$ 50.000")).toBeInTheDocument();
  });

  it("invites to add incomes when nothing came in", async () => {
    handlers({ income: 0 });
    render(<InicioYo />, { wrapper: WithSWR });
    expect(await screen.findByText("Cargá tus ingresos")).toHaveAttribute("href", "/ingresos");
    expect(screen.queryByText("Te pasaste")).not.toBeInTheDocument();
  });

  it("shows Comprometido and the statements to pay", async () => {
    handlers();
    render(<InicioYo />, { wrapper: WithSWR });
    expect(await screen.findByText(/Diciembre ya tiene/)).toHaveTextContent("Diciembre ya tiene $ 214.800 en cuotas.");
    expect(screen.getByText("Ver tarjetas")).toHaveAttribute("href", "/tarjetas");
    const due = screen.getByText("Tarjetas que vencen").parentElement!;
    expect(within(due).getAllByRole("link")).toHaveLength(1); // Mastercard has nothing to pay
    expect(within(due).getByText("Visa ···· 4417")).toBeInTheDocument();
    expect(within(due).getByText("Vence el 3/12 · cerró el 24")).toBeInTheDocument();
    expect(within(due).getByText("$ 312.400")).toBeInTheDocument();
    expect(within(due).getByRole("link")).toHaveAttribute("href", "/tarjetas/visa/resumen/2026-11");
  });

  it("hides the card sections without credit cards", async () => {
    handlers({ cards: { months: [], cards: [] } });
    render(<InicioYo />, { wrapper: WithSWR });
    await screen.findByText("Últimos movimientos");
    expect(screen.queryByText("Comprometido")).not.toBeInTheDocument();
    expect(screen.queryByText("Tarjetas que vencen")).not.toBeInTheDocument();
  });

  it("shows the latest insight and the last movements", async () => {
    handlers();
    render(<InicioYo />, { wrapper: WithSWR });
    expect(await screen.findByText("Gastaste 18% más en delivery.")).toBeInTheDocument();
    expect(screen.getByText("Tu semana")).toBeInTheDocument();
    expect((await screen.findAllByText("Heladera"))[0]).toBeInTheDocument();
    expect(screen.getAllByText("12 cuotas").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: /Heladera/ })[0]).toHaveAttribute("href", "/movimientos/e1");
  });
});
