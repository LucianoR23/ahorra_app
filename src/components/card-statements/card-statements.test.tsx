import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CardStatementDetailView } from "./card-statement-detail";
import { CardStatementsSummary } from "./card-statements-summary";
import type { CardStatement, CardStatementDetail } from "@/lib/api/schemas";
import { confirm } from "@/lib/confirm";
import { API, requests, server, signIn } from "@/test/msw";
import { personalSpace, WithSWR } from "@/test/spaces";

// Credit card statements (plan 4.1).

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, push: vi.fn(), back: vi.fn() }) }));
vi.mock("@/lib/confirm", () => ({ confirm: vi.fn() }));

const pm = (id: string, name: string, kind = "credit") => ({
  id,
  ownerUserId: "u1",
  name,
  kind,
  allowsInstallments: kind === "credit",
  isActive: true,
  createdAt: "2026-01-01T00:00:00Z",
});

const card = (pmId: string, closing: number, due: number, lastFour: string) => ({
  id: `cc-${pmId}`,
  paymentMethodId: pmId,
  alias: pmId,
  lastFour,
  defaultClosingDay: closing,
  defaultDueDay: due,
  createdAt: "2026-01-01T00:00:00Z",
});

const st = (periodYm: string, extra: Partial<CardStatement> = {}): CardStatement => ({
  periodYm,
  closingDate: `${periodYm}-24`,
  dueDate: "2026-12-03",
  status: "closed",
  totals: [{ currency: "ARS", amount: 312400 }],
  installmentCount: 4,
  minimumPayment: null,
  paidAt: null,
  paidAmount: null,
  paidCurrency: null,
  ...extra,
});

const detail = (extra: Partial<CardStatementDetail> = {}): CardStatementDetail => ({
  ...st("2026-11"),
  installments: [
    {
      installmentId: "i1",
      expenseId: "e1",
      householdId: personalSpace.id,
      categoryId: null,
      description: "Notebook",
      spentAt: "2026-08-10",
      installmentNumber: 4,
      totalInstallments: 6,
      amount: 145000,
      currency: "ARS",
      isPaid: false,
    },
  ],
  adjustments: [
    { id: "a1", kind: "interest", description: "Intereses", amount: 1200, currency: "ARS", createdAt: "2026-11-25T00:00:00Z" },
  ],
  ...extra,
});

const statements = {
  visa: { openPeriodYm: "2026-12", statements: [st("2026-11"), st("2026-12", { status: "open", totals: [{ currency: "ARS", amount: 186320 }], closingDate: "2026-12-24" })] },
  master: { openPeriodYm: "2026-12", statements: [st("2026-11", { totals: [{ currency: "ARS", amount: 5000 }, { currency: "USD", amount: 20 }] })] },
};

function lastBody(method: string, pathEnd: string) {
  const req = requests().filter((r) => r.method === method && r.path.endsWith(pathEnd)).at(-1);
  return req ? JSON.parse(req.body || "{}") : undefined;
}

beforeEach(() => {
  signIn({ householdId: personalSpace.id });
  vi.mocked(confirm).mockReset();
  replace.mockReset();
  server.use(
    http.get(`${API}/payment-methods`, () =>
      HttpResponse.json([pm("cash", "Efectivo", "cash"), pm("visa", "Visa Galicia"), pm("master", "Mastercard")]),
    ),
    http.get(`${API}/payment-methods/visa/credit-card`, () => HttpResponse.json(card("visa", 24, 3, "4417"))),
    http.get(`${API}/payment-methods/master/credit-card`, () => HttpResponse.json(card("master", 28, 8, "0921"))),
    http.get(`${API}/payment-methods/:id/credit-card/statements`, ({ params }) =>
      HttpResponse.json(statements[params.id as "visa" | "master"]),
    ),
    http.post(`${API}/payment-methods/:id/credit-card/statements/:ym/pay`, () => HttpResponse.json(detail({ status: "paid" }))),
    http.post(`${API}/payment-methods/:id/credit-card/statements/:ym/unpay`, () => HttpResponse.json(detail())),
    http.get(`${API}/payment-methods/visa/credit-card/statements/2026-11`, () => HttpResponse.json(detail())),
    http.get(`${API}/households`, () => HttpResponse.json([personalSpace])),
    http.get(`${API}/credit-cards/committed`, () => HttpResponse.json({ months: [], cards: [] })),
    http.get(`${API}/payment-methods/:id/credit-card/installment-plans`, () => HttpResponse.json({ plans: [] })),
  );
});

describe("CardStatementsSummary", () => {
  it("shows the statement to pay and what the next one has so far", async () => {
    render(<CardStatementsSummary />, { wrapper: WithSWR });
    expect(await screen.findByText("$ 312.400")).toBeInTheDocument();
    expect(screen.getByText("Resumen a pagar")).toBeInTheDocument();
    expect(screen.getByText("Cerró el 24/11 · vence el jueves 3/12")).toBeInTheDocument();
    expect(screen.getByText("Próximo resumen")).toBeInTheDocument();
    expect(screen.getByText("Cierra el 24/12 · lo que va hasta hoy")).toBeInTheDocument();
    expect(screen.getByText("$ 186.320")).toBeInTheDocument();
    expect(screen.getByText("Ver detalle").closest("a")).toHaveAttribute("href", "/tarjetas/visa/resumen/2026-11");
  });

  it("switches card, showing each currency apart", async () => {
    render(<CardStatementsSummary />, { wrapper: WithSWR });
    const tabs = await screen.findByRole("tablist", { name: "Tarjeta" });
    expect(within(tabs).getAllByRole("tab")).toHaveLength(2); // cash is not a card
    expect(await within(tabs).findByText("···· 0921 · Cierra el 28 · vence el 8")).toBeInTheDocument();
    await userEvent.click(within(tabs).getByRole("tab", { name: /Mastercard/ }));
    expect(await screen.findByText("$ 5.000")).toBeInTheDocument();
    expect(screen.getByText("US$ 20")).toBeInTheDocument();
  });

  it("marks the statement paid with its total, or with what was paid", async () => {
    render(<CardStatementsSummary />, { wrapper: WithSWR });
    await userEvent.click(await screen.findByRole("button", { name: "Marcar como pagado" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByLabelText("Monto pagado")).toHaveValue("312400");
    expect(within(dialog).getByText(/Las 4 cuotas de este resumen quedan pagadas/)).toBeInTheDocument();

    await userEvent.clear(within(dialog).getByLabelText("Monto pagado"));
    await userEvent.type(within(dialog).getByLabelText("Monto pagado"), "50000,5");
    await userEvent.click(within(dialog).getByRole("button", { name: "Marcar como pagado" }));
    await waitFor(() => expect(lastBody("POST", "/2026-11/pay")).toEqual({ amount: 50000.5, currency: "ARS" }));
  });

  it("invites to add a card when there is none", async () => {
    server.use(http.get(`${API}/payment-methods`, () => HttpResponse.json([pm("cash", "Efectivo", "cash")])));
    render(<CardStatementsSummary />, { wrapper: WithSWR });
    expect(await screen.findByText("Todavía no cargaste tarjetas de crédito")).toBeInTheDocument();
  });
});

describe("CardStatementDetailView", () => {
  it("lists the installments, from which space, and the adjustments", async () => {
    render(<CardStatementDetailView paymentMethodId="visa" ym="2026-11" />, { wrapper: WithSWR });
    expect(await screen.findByText("Notebook")).toBeInTheDocument();
    expect(await screen.findByText(/Cuota 4 de 6 · Mi plata/)).toBeInTheDocument();
    expect(screen.getByText("$ 145.000")).toBeInTheDocument();
    expect(screen.getAllByText("Intereses")).toHaveLength(2); // its description and its kind
    expect(screen.getByRole("heading", { name: "Resumen de Visa Galicia" })).toBeInTheDocument();
  });

  it("moves between months", async () => {
    render(<CardStatementDetailView paymentMethodId="visa" ym="2026-11" />, { wrapper: WithSWR });
    await userEvent.click(await screen.findByRole("button", { name: "Mes siguiente" }));
    expect(replace).toHaveBeenCalledWith("/tarjetas/visa/resumen/2026-12");
  });

  it("adds an adjustment", async () => {
    server.use(
      http.post(`${API}/payment-methods/visa/credit-card/statements/2026-11/adjustments`, () => HttpResponse.json(detail(), { status: 201 })),
    );
    render(<CardStatementDetailView paymentMethodId="visa" ym="2026-11" />, { wrapper: WithSWR });
    await userEvent.click(await screen.findByRole("button", { name: /Agregar/ }));
    const dialog = await screen.findByRole("dialog");
    await userEvent.type(within(dialog).getByLabelText("Descripción"), "IVA");
    await userEvent.type(within(dialog).getByLabelText("Monto"), "252");
    await userEvent.click(within(dialog).getByRole("button", { name: "Agregar" }));
    await waitFor(() =>
      expect(lastBody("POST", "/adjustments")).toEqual({ kind: "interest", description: "IVA", amount: 252, currency: "ARS" }),
    );
  });

  it("deletes an adjustment after confirming", async () => {
    server.use(
      http.delete(`${API}/payment-methods/visa/credit-card/statements/2026-11/adjustments/a1`, () => HttpResponse.json(detail({ adjustments: [] }))),
    );
    vi.mocked(confirm).mockResolvedValue(true);
    render(<CardStatementDetailView paymentMethodId="visa" ym="2026-11" />, { wrapper: WithSWR });
    await userEvent.click(await screen.findByRole("button", { name: "Borrar Intereses" }));
    await waitFor(() => expect(requests().some((r) => r.method === "DELETE" && r.path.endsWith("/adjustments/a1"))).toBe(true));
  });

  it("unmarks a payment after confirming", async () => {
    server.use(
      http.get(`${API}/payment-methods/visa/credit-card/statements/2026-11`, () =>
        HttpResponse.json(detail({ status: "paid", paidAt: "2026-12-01T12:00:00Z", paidAmount: 400, paidCurrency: "ARS" })),
      ),
    );
    vi.mocked(confirm).mockResolvedValue(true);
    render(<CardStatementDetailView paymentMethodId="visa" ym="2026-11" />, { wrapper: WithSWR });
    expect(await screen.findByText(/Pagaste/)).toHaveTextContent("Pagaste $ 400 el 1/12");
    await userEvent.click(screen.getByRole("button", { name: "Desmarcar pago" }));
    await waitFor(() => expect(requests().some((r) => r.method === "POST" && r.path.endsWith("/2026-11/unpay"))).toBe(true));
  });

  it("sets the minimum payment", async () => {
    server.use(
      http.patch(`${API}/payment-methods/visa/credit-card/statements/2026-11`, () => HttpResponse.json(detail({ minimumPayment: 30000 }))),
    );
    render(<CardStatementDetailView paymentMethodId="visa" ym="2026-11" />, { wrapper: WithSWR });
    await userEvent.click(await screen.findByRole("button", { name: "Cargar" }));
    const dialog = await screen.findByRole("dialog");
    await userEvent.type(within(dialog).getByLabelText("Monto"), "30000");
    await userEvent.click(within(dialog).getByRole("button", { name: "Guardar" }));
    await waitFor(() => expect(lastBody("PATCH", "/2026-11")).toEqual({ minimumPayment: 30000 }));
  });
});
