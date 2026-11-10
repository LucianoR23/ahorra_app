import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ExpenseForm } from "./expense-form";
import { FxSourceSetting } from "./fx-source-setting";
import { IncomeForm } from "./income-form";
import { API, requests, resetRequests, server, signIn } from "@/test/msw";
import { personalSpace, WithSWR } from "@/test/spaces";

// Rate sources (plan 5.1): the space's dollar, and another one per movement.

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, back: vi.fn(), push: vi.fn() }) }));

const rate = (source: string, rateSell: number) => ({
  currency: "USD", source, rateSell, rateAvg: rateSell - 10, rateBuy: rateSell - 20,
  lastUpdate: "2026-11-10T12:00:00Z", fetchedAt: "2026-11-10T12:00:00Z",
});

const cash = {
  id: "pm1", ownerUserId: "u1", name: "Efectivo", kind: "cash",
  allowsInstallments: false, isActive: true, createdAt: "2026-01-01T00:00:00Z",
};

function api(space = { ...personalSpace, fxSource: "bolsa" }) {
  server.use(
    http.get(`${API}/households`, () => HttpResponse.json([space])),
    http.get(`${API}/exchange-rates/current`, () =>
      HttpResponse.json([rate("bolsa", 1587.9), rate("tarjeta", 2041), rate("contadoconliqui", 1664.9), rate("oficial", 1570)]),
    ),
    http.get(`${API}/payment-methods`, () => HttpResponse.json([cash])),
    http.get(`${API}/households/:id/members`, () =>
      HttpResponse.json([{ userId: "u1", email: "", firstName: "Ana", lastName: "T", role: "owner", joinedAt: "" }]),
    ),
    http.post(`${API}/expenses`, () => HttpResponse.json({ expense: { id: "e1" }, installments: [], shares: [] }, { status: 201 })),
    http.post(`${API}/incomes`, () =>
      HttpResponse.json({ id: "i1", householdId: "p1", receivedBy: "u1", amount: 1, currency: "USD", amountBase: 1, baseCurrency: "ARS", source: "salary", receivedAt: "2026-11-10", createdAt: "" }, { status: 201 }),
    ),
    http.patch(`${API}/households/:id`, async ({ request }) => HttpResponse.json({ ...space, ...((await request.json()) as object) })),
    http.get(`${API}/*`, () => HttpResponse.json([])),
  );
}

const body = (method: string, path: string) => JSON.parse(requests().find((r) => r.method === method && r.path === path)?.body || "{}");

beforeEach(() => {
  replace.mockClear();
  resetRequests();
  localStorage.clear();
  signIn({ householdId: personalSpace.id });
});

describe("Cargar gasto in dollars", () => {
  it("converts at the space's dollar, and at the one picked for this expense", async () => {
    api();
    render(<ExpenseForm />, { wrapper: WithSWR });
    await userEvent.type(await screen.findByLabelText("Monto"), "100");
    await userEvent.click(screen.getByRole("radio", { name: "USD" }));

    expect(await screen.findByLabelText("Cotización")).toHaveTextContent("MEP · $ 1.587,90");
    expect(screen.getByText(/al dólar MEP/)).toHaveTextContent("≈ $ 158.790 al dólar MEP");

    // A card purchase abroad: the card dollar.
    await userEvent.click(screen.getByLabelText("Cotización"));
    await userEvent.click(await screen.findByRole("option", { name: "Tarjeta · $ 2.041" }));
    expect(screen.getByText(/al dólar Tarjeta/)).toHaveTextContent("≈ $ 204.100 al dólar Tarjeta");

    await userEvent.type(screen.getByLabelText("Descripción"), "Hotel");
    await userEvent.click(screen.getByLabelText("Pago"));
    await userEvent.click(await screen.findByRole("option", { name: /Efectivo/ }));
    await userEvent.click(screen.getByRole("button", { name: "Guardar gasto" }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/movimientos/e1"));
    expect(body("POST", "/expenses")).toMatchObject({ amount: 100, currency: "USD", rateSource: "tarjeta" });
  });

  it("in pesos there is nothing to pick and nothing is sent", async () => {
    api();
    render(<ExpenseForm />, { wrapper: WithSWR });
    await userEvent.type(await screen.findByLabelText("Monto"), "100");
    expect(screen.queryByLabelText("Cotización")).not.toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Descripción"), "Café");
    await userEvent.click(screen.getByLabelText("Pago"));
    await userEvent.click(await screen.findByRole("option", { name: /Efectivo/ }));
    await userEvent.click(screen.getByRole("button", { name: "Guardar gasto" }));
    await waitFor(() => expect(replace).toHaveBeenCalled());
    expect(body("POST", "/expenses").rateSource).toBeUndefined();
  });

  it("starts with the space's own dollar", async () => {
    api({ ...personalSpace, fxSource: "oficial" });
    render(<ExpenseForm />, { wrapper: WithSWR });
    await userEvent.click(await screen.findByRole("radio", { name: "USD" }));
    expect(await screen.findByLabelText("Cotización")).toHaveTextContent("Oficial · $ 1.570");
  });
});

describe("Cargar ingreso in dollars", () => {
  it("lets a freelancer record the dollars sold through CCL", async () => {
    api();
    render(<IncomeForm />, { wrapper: WithSWR });
    await userEvent.type(await screen.findByLabelText("Monto"), "1000");
    await userEvent.click(screen.getByRole("radio", { name: "USD" }));
    await userEvent.click(await screen.findByLabelText("Cotización"));
    await userEvent.click(await screen.findByRole("option", { name: "CCL · $ 1.664,90" }));
    expect(screen.getByText(/al dólar CCL/)).toHaveTextContent("≈ $ 1.664.900 al dólar CCL");
    await userEvent.click(screen.getByRole("button", { name: "Guardar ingreso" }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/ingresos/i1"));
    expect(body("POST", "/incomes")).toMatchObject({ amount: 1000, currency: "USD", rateSource: "contadoconliqui" });
  });
});

describe("FxSourceSetting", () => {
  it("the owner changes the space's dollar", async () => {
    api();
    render(<FxSourceSetting household={{ ...personalSpace, fxSource: "bolsa" }} editable title="Cotización de Mi plata" />, { wrapper: WithSWR });
    const select = await screen.findByLabelText("Dólar para convertir");
    await waitFor(() => expect(select).toHaveTextContent("MEP · $ 1.587,90"));
    await userEvent.click(select);
    await userEvent.click(await screen.findByRole("option", { name: "Oficial · $ 1.570" }));
    await waitFor(() => expect(body("PATCH", `/households/${personalSpace.id}`)).toEqual({ name: "Mi plata", baseCurrency: "ARS", fxSource: "oficial" }));
  });

  it("a member who is not the owner only sees it", async () => {
    api();
    render(<FxSourceSetting household={{ ...personalSpace, fxSource: "blue" }} editable={false} title="Cotización del hogar" />, { wrapper: WithSWR });
    expect(await screen.findByText("Blue")).toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });
});
