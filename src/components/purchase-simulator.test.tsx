import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it } from "vitest";
import { PurchaseSimulator } from "./purchase-simulator";
import type { PurchaseSimulation } from "@/lib/api/schemas";
import { API, requests, resetRequests, server, signIn } from "@/test/msw";
import { personalSpace, WithSWR } from "@/test/spaces";
import { useDiscreetStore } from "@/stores/discreet";

// "¿Me lo puedo comprar?" (plan 4.8).

const visa = {
  id: "visa", ownerUserId: "u1", name: "Visa", kind: "credit",
  allowsInstallments: true, isActive: true, createdAt: "2026-01-01T00:00:00Z",
};
const cash = {
  id: "cash", ownerUserId: "u1", name: "Efectivo", kind: "cash",
  allowsInstallments: false, isActive: true, createdAt: "2026-01-01T00:00:00Z",
};
const super_ = {
  id: "c-super", householdId: personalSpace.id, name: "Súper",
  createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z",
};

const month = (periodYm: string, cardsBefore: number, purchase: number, income: number, fixed = 100000) => {
  const cardsAfter = cardsBefore + purchase;
  return {
    periodYm, cardsBefore, purchase, cardsAfter, fixed, income,
    left: income - cardsAfter - fixed,
    pctOfIncome: income > 0 ? Math.round((cardsAfter / income) * 1000) / 10 : null,
  };
};

const simulation: PurchaseSimulation = {
  baseCurrency: "ARS",
  purchase: {
    paymentMethodId: "visa", isCredit: true, amount: 120000, currency: "ARS", amountBase: 120000,
    installments: ["2026-12", "2027-01", "2027-02", "2027-03", "2027-04", "2027-05"].map((periodYm, i) => ({
      number: i + 1, amountBase: 20000, periodYm, dueDate: null,
    })),
  },
  months: [
    month("2026-12", 300000, 20000, 500000),
    month("2027-01", 395000, 20000, 500000),
    month("2027-02", 0, 20000, 500000),
  ],
  card: [
    { periodYm: "2026-12", before: 300000, after: 320000 },
    { periodYm: "2027-01", before: 0, after: 20000 },
    { periodYm: "2027-02", before: 0, after: 0 },
  ],
  goals: [
    {
      goalId: "g1", goalType: "total_limit", scope: "household", categoryId: null, target: 1000000,
      current: 200000, thisPeriod: 0, after: 200000, pctAfter: 20, exceeds: false, perInstallment: 20000, pctPerInstallment: 2,
    },
    {
      goalId: "g2", goalType: "category_limit", scope: "household", categoryId: "c-super", target: 50000,
      current: 45000, thisPeriod: 20000, after: 65000, pctAfter: 130, exceeds: true, perInstallment: 20000, pctPerInstallment: 40,
    },
  ],
  hasIncome: true,
  todayRate: false,
};

function api(result: PurchaseSimulation = simulation) {
  server.use(
    http.get(`${API}/households`, () => HttpResponse.json([personalSpace])),
    http.get(`${API}/payment-methods`, () => HttpResponse.json([cash, visa])),
    http.get(`${API}/categories`, () => HttpResponse.json([super_])),
    http.post(`${API}/simulations/purchase`, () => HttpResponse.json(result)),
    http.get(`${API}/*`, () => HttpResponse.json([])),
  );
}

async function simulate(opts: { card?: string; installments?: string; category?: boolean } = {}) {
  await userEvent.type(await screen.findByLabelText("Monto"), "120000");
  await userEvent.click(screen.getByLabelText("Pago"));
  await userEvent.click(await screen.findByRole("option", { name: new RegExp(opts.card ?? "Visa") }));
  if (opts.installments) {
    fireEvent.change(screen.getByLabelText("Cuotas"), { target: { value: opts.installments } });
  }
  if (opts.category) {
    await userEvent.click(screen.getByLabelText("Categoría"));
    await userEvent.click(await screen.findByRole("option", { name: "Súper" }));
  }
  await userEvent.click(screen.getByRole("button", { name: "Ver cómo me queda" }));
}

const post = () => requests().find((r) => r.method === "POST" && r.path === "/simulations/purchase");

beforeEach(() => {
  resetRequests();
  useDiscreetStore.setState({ hidden: false });
  signIn({ householdId: personalSpace.id });
});

describe("PurchaseSimulator (plan 4.8)", () => {
  it("sends the purchase and shows the months, the card and the limits", async () => {
    api();
    render(<PurchaseSimulator />, { wrapper: WithSWR });
    await simulate({ installments: "6", category: true });

    expect(await screen.findByText(/Pagarías 6 cuotas de/)).toHaveTextContent(
      "Pagarías 6 cuotas de $ 20.000 desde el resumen de diciembre.",
    );
    const body = JSON.parse(post()!.body || "{}");
    expect(body).toEqual({ paymentMethodId: "visa", categoryId: "c-super", amount: 120000, currency: "ARS", installments: 6 });
    expect(post()!.headers.get("x-household-id")).toBe(personalSpace.id);

    // The tightest month: January, with 395.000 already on the cards.
    expect(screen.getByText(/te faltarían/)).toHaveTextContent("En enero te faltarían $ 15.000");
    const months = screen.getAllByTestId("sim-month");
    expect(months).toHaveLength(3);
    expect(within(months[0]).getByText(/Tarjetas/)).toHaveTextContent("Tarjetas $ 320.000 · 64% del ingreso");
    expect(within(months[0]).getByText(/Esta compra/)).toHaveTextContent("Esta compra $ 20.000 · Fijos $ 100.000");
    expect(within(months[0]).getByText(/Quedan/)).toHaveTextContent("Quedan $ 80.000");

    expect(screen.getByRole("heading", { name: "Resúmenes de tu Visa" })).toBeInTheDocument();
    expect(screen.getByText("Límite total:").parentElement).toHaveTextContent("cada cuota usa el 2% del límite.");
    expect(screen.getByText("Límite de Súper:").parentElement).toHaveTextContent("este mes llegarías al 130% y te pasarías.");

    expect(screen.getByRole("link", { name: "Cargar compra" })).toHaveAttribute(
      "href",
      "/agregar?amount=120000&currency=ARS&paymentMethodId=visa&installments=6&categoryId=c-super",
    );
  });

  it("says what would be missing in a month that does not close", async () => {
    api({ ...simulation, months: [month("2026-12", 390000, 20000, 500000, 150000), month("2027-01", 0, 20000, 500000)] });
    render(<PurchaseSimulator />, { wrapper: WithSWR });
    await simulate({ installments: "6" });
    expect(await screen.findByText(/te faltarían/)).toHaveTextContent("En diciembre te faltarían $ 60.000");
    expect(screen.getByText(/Faltan/)).toHaveTextContent("Faltan $ 60.000");
  });

  it("asks for the salary when there is no recurring income", async () => {
    api({
      ...simulation,
      hasIncome: false,
      months: simulation.months.map((m) => ({ ...m, income: 0, left: -m.cardsAfter - m.fixed, pctOfIncome: null })),
    });
    render(<PurchaseSimulator />, { wrapper: WithSWR });
    await simulate({ installments: "6" });
    expect(await screen.findByRole("link", { name: "Recurrentes" })).toHaveAttribute("href", "/recurrentes");
    expect(screen.queryByText(/mes más justo/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Quedan|Faltan/)).not.toBeInTheDocument();
    expect(screen.queryByText(/del ingreso/)).not.toBeInTheDocument();
  });

  it("cash is one payment: no installments, no card, no cuotas o contado", async () => {
    api({
      ...simulation,
      purchase: { ...simulation.purchase, paymentMethodId: "cash", isCredit: false, installments: [{ number: 1, amountBase: 120000, periodYm: "2026-12", dueDate: null }] },
      card: [],
      goals: [],
    });
    render(<PurchaseSimulator />, { wrapper: WithSWR });
    await simulate({ card: "Efectivo" });
    expect(screen.queryByLabelText("Cuotas")).not.toBeInTheDocument();
    expect(await screen.findByText(/Pagarías/)).toHaveTextContent("Pagarías $ 120.000 ahora.");
    expect(JSON.parse(post()!.body || "{}").installments).toBe(1);
    expect(screen.queryByRole("heading", { name: /Resúmenes/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Cuotas o contado/ })).not.toBeInTheDocument();
  });

  it("compares installments with paying cash at the yield the user types", async () => {
    api();
    render(<PurchaseSimulator />, { wrapper: WithSWR });
    await simulate({ installments: "6" });
    await userEvent.click(await screen.findByRole("button", { name: /Cuotas o contado/ }));
    expect(screen.getByRole("status")).toHaveTextContent(/^Te conviene en cuotas: hoy valen \$ 112\.0\d\d/);

    const cashPrice = screen.getByLabelText("Precio de contado");
    await userEvent.clear(cashPrice);
    await userEvent.type(cashPrice, "90000");
    expect(screen.getByRole("status")).toHaveTextContent(/^Te conviene de contado/);
  });

  it("checks the form before asking, and a change clears the last answer", async () => {
    api();
    render(<PurchaseSimulator />, { wrapper: WithSWR });
    await userEvent.click(await screen.findByRole("button", { name: "Ver cómo me queda" }));
    expect(screen.getByText("Ingresá un monto mayor a 0")).toBeInTheDocument();
    expect(screen.getByText("Elegí con qué pagarías")).toBeInTheDocument();
    expect(post()).toBeUndefined();

    await simulate({ installments: "6" });
    expect(await screen.findByText(/Pagarías/)).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Monto"), "0");
    expect(screen.queryByText(/Pagarías/)).not.toBeInTheDocument();
  });

  it("hides the amounts in discreet mode", async () => {
    api();
    useDiscreetStore.setState({ hidden: true });
    render(<PurchaseSimulator />, { wrapper: WithSWR });
    await simulate({ installments: "6" });
    expect(await screen.findByText(/Pagarías/)).toHaveTextContent("Pagarías 6 cuotas de $ •••••• desde el resumen de diciembre.");
    expect(screen.queryByText(/320\.000/)).not.toBeInTheDocument();
  });
});
