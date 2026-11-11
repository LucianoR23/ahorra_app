import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { IncomeDetailView } from "./income-detail";
import { IncomeForm } from "./income-form";
import { IncomesList } from "./incomes-list";
import { confirm } from "@/lib/confirm";
import { useHouseholdStore } from "@/stores/household";
import { API, server, signIn } from "@/test/msw";
import { hogarSpace, personalSpace, WithSWR } from "@/test/spaces";

// Ingresos (plan 1.10b, the Movimientos, Detalle and CargarGasto patterns).

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, push: vi.fn(), back: vi.fn() }), usePathname: () => "/ingresos" }));
vi.mock("@/lib/confirm", () => ({ confirm: vi.fn() }));
vi.mock("@/components/ui/info-help", () => ({ InfoHelp: () => null }));

const income = (id: string, over: Record<string, unknown> = {}) => ({
  id,
  householdId: personalSpace.id,
  receivedBy: "u1",
  paymentMethodId: null,
  amount: 1151143,
  currency: "ARS",
  amountBase: 1151143,
  baseCurrency: "ARS",
  source: "salary",
  description: "Sueldo noviembre",
  receivedAt: "2026-11-09",
  createdAt: "2026-11-09T00:00:00Z",
  ...over,
});

let sent: { method: string; body: unknown }[] = [];

function handlers({ items = [income("i1"), income("i2", { description: null, source: "freelance", amount: 500, currency: "USD", amountBase: 750000, receivedAt: "2026-11-02" })] } = {}) {
  sent = [];
  server.use(
    http.get(`${API}/households`, () => HttpResponse.json([personalSpace])),
    http.get(`${API}/households/:id/members`, () =>
      HttpResponse.json([{ userId: "u1", email: "", firstName: "Ana", lastName: "T", role: "owner", joinedAt: "" }]),
    ),
    http.get(`${API}/payment-methods`, () =>
      HttpResponse.json([
        { id: "cuenta", ownerUserId: "u1", name: "Galicia", kind: "debit", allowsInstallments: false, isActive: true, createdAt: "" },
        { id: "visa", ownerUserId: "u1", name: "Visa", kind: "credit", allowsInstallments: true, isActive: true, createdAt: "" },
      ]),
    ),
    http.get(`${API}/incomes`, () => HttpResponse.json({ items, totalCount: items.length, limit: 50, offset: 0 })),
    http.get(`${API}/totals/income`, () => HttpResponse.json({ total: 1901143, baseCurrency: "ARS", from: "", to: "" })),
    http.get(`${API}/incomes/i1`, () => HttpResponse.json(income("i1", { paymentMethodId: "cuenta" }))),
    http.get(`${API}/exchange-rates`, () => HttpResponse.json([])),
    http.post(`${API}/incomes`, async ({ request }) => {
      sent.push({ method: "POST", body: await request.json() });
      return HttpResponse.json(income("new"), { status: 201 });
    }),
    http.patch(`${API}/incomes/i1`, async ({ request }) => {
      sent.push({ method: "PATCH", body: await request.json() });
      return HttpResponse.json(income("i1"));
    }),
    http.delete(`${API}/incomes/i1`, () => {
      sent.push({ method: "DELETE", body: null });
      return new HttpResponse(null, { status: 204 });
    }),
  );
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true, toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-09T12:00:00-03:00"));
  signIn({ householdId: personalSpace.id });
  replace.mockReset();
});

describe("IncomesList", () => {
  it("shows the month's total and the incomes by day", async () => {
    handlers();
    render(<IncomesList />, { wrapper: WithSWR });
    expect(await screen.findByText(/Entraron/)).toHaveTextContent("Entraron + $ 1.901.143 · 2 ingresos");
    const today = await screen.findByRole("region", { name: "Hoy" });
    const sueldo = within(today).getByRole("link", { name: /Sueldo noviembre/ });
    expect(sueldo).toHaveTextContent("Salario");
    expect(sueldo).toHaveTextContent("+ $ 1.151.143");
    expect(sueldo).toHaveAttribute("href", "/ingresos/i1");
    // No description: the source names it; dollars show their pesos.
    const freelance = screen.getByRole("link", { name: /Freelance/ });
    expect(freelance).toHaveTextContent("≈ $ 750.000");
    expect(freelance).toHaveTextContent("+ US$ 500");
    expect(screen.getByLabelText("Nuevo ingreso")).toHaveAttribute("href", "/ingresos/nuevo");
  });

  it("invites to add one when the month is empty", async () => {
    handlers({ items: [] });
    render(<IncomesList />, { wrapper: WithSWR });
    expect(await screen.findByText("Sin ingresos este mes")).toBeInTheDocument();
    expect(screen.getByText("Cargar un ingreso")).toHaveAttribute("href", "/ingresos/nuevo");
  });
});

describe("IncomeDetailView", () => {
  it("shows the income and its data", async () => {
    handlers();
    render(<IncomeDetailView id="i1" />, { wrapper: WithSWR });
    expect(await screen.findByRole("heading", { name: "Sueldo noviembre" })).toBeInTheDocument();
    expect(screen.getByText("+ $ 1.151.143")).toBeInTheDocument();
    const row = (label: string) => screen.getByText(label, { selector: "dt" }).nextElementSibling;
    expect(row("Fuente")).toHaveTextContent("Salario");
    expect(row("Fecha")).toHaveTextContent("09/11/2026");
    expect(await screen.findByText("Galicia")).toBeInTheDocument();
    expect(row("Espacio")).toHaveTextContent("Mi plata");
  });

  it("edits the source with one of its own", async () => {
    handlers();
    render(<IncomeDetailView id="i1" />, { wrapper: WithSWR });
    await userEvent.click(await screen.findByRole("button", { name: "Editar ingreso" }));
    await userEvent.click(screen.getByLabelText("Fuente"));
    await userEvent.click(await screen.findByRole("option", { name: "Otro" }));
    await userEvent.type(screen.getByLabelText("Otra fuente"), "Alquiler");
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));
    await vi.waitFor(() => expect(sent).toContainEqual({ method: "PATCH", body: expect.objectContaining({ source: "Alquiler" }) }));
  });

  it("deletes after confirming", async () => {
    handlers();
    vi.mocked(confirm).mockResolvedValue(true);
    render(<IncomeDetailView id="i1" />, { wrapper: WithSWR });
    await userEvent.click(await screen.findByRole("button", { name: "Eliminar ingreso" }));
    await vi.waitFor(() => expect(replace).toHaveBeenCalledWith("/ingresos"));
    expect(sent).toContainEqual({ method: "DELETE", body: null });
  });

  it("passes it to the hogar after confirming, and follows it there (plan 9.1)", async () => {
    handlers();
    const moves: unknown[] = [];
    server.use(
      http.get(`${API}/households`, () => HttpResponse.json([personalSpace, hogarSpace])),
      http.post(`${API}/incomes/i1/move`, async ({ request }) => {
        moves.push(await request.json());
        return HttpResponse.json(income("i1", { householdId: hogarSpace.id }));
      }),
    );
    vi.mocked(confirm).mockResolvedValueOnce(true);
    render(<IncomeDetailView id="i1" />, { wrapper: WithSWR });
    await userEvent.click(await screen.findByRole("button", { name: "Pasar al Hogar" }));
    expect(confirm).toHaveBeenLastCalledWith(expect.objectContaining({ title: "¿Pasar este ingreso al Hogar?" }));
    await vi.waitFor(() => expect(moves).toEqual([{ householdId: hogarSpace.id }]));
    await vi.waitFor(() => expect(useHouseholdStore.getState().currentId).toBe(hogarSpace.id));
  });

  it("offers Mi plata from the hogar, only to whoever received it", async () => {
    signIn({ householdId: hogarSpace.id });
    handlers();
    server.use(
      http.get(`${API}/households`, () => HttpResponse.json([personalSpace, hogarSpace])),
      http.get(`${API}/incomes/i1`, () => HttpResponse.json(income("i1", { householdId: hogarSpace.id }))),
      http.get(`${API}/incomes/i2`, () => HttpResponse.json(income("i2", { householdId: hogarSpace.id, receivedBy: "u2" }))),
    );
    const { unmount } = render(<IncomeDetailView id="i1" />, { wrapper: WithSWR });
    expect(await screen.findByRole("button", { name: "Pasar a Mi plata" })).toBeInTheDocument();
    unmount();
    render(<IncomeDetailView id="i2" />, { wrapper: WithSWR });
    expect(await screen.findByText("Casa", { selector: "dd" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Pasar a/ })).not.toBeInTheDocument();
  });

  it("has nothing to move without a hogar", async () => {
    handlers();
    render(<IncomeDetailView id="i1" />, { wrapper: WithSWR });
    expect(await screen.findByText("Mi plata", { selector: "dd" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Pasar a/ })).not.toBeInTheDocument();
  });
});

describe("IncomeForm", () => {
  it("saves the income and opens it", async () => {
    handlers();
    render(<IncomeForm />, { wrapper: WithSWR });
    await userEvent.type(await screen.findByLabelText("Monto"), "250000");
    await userEvent.click(screen.getByRole("radio", { name: "USD" }));
    await userEvent.type(screen.getByLabelText("Descripción"), "Proyecto");
    await userEvent.click(screen.getByRole("button", { name: "Guardar ingreso" }));
    await vi.waitFor(() => expect(replace).toHaveBeenCalledWith("/ingresos/new"));
    expect(sent[0].body).toMatchObject({ amount: 250000, currency: "USD", source: "salary", description: "Proyecto", receivedAt: "2026-11-09" });
  });

  it("offers accounts, not credit cards, and asks who received it only with others in the space", async () => {
    handlers();
    render(<IncomeForm />, { wrapper: WithSWR });
    await userEvent.click(await screen.findByLabelText("Cuenta"));
    expect(await screen.findByRole("option", { name: "Galicia" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Visa" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Lo recibió")).not.toBeInTheDocument();
  });

  it("says what is missing", async () => {
    handlers();
    render(<IncomeForm />, { wrapper: WithSWR });
    await userEvent.click(await screen.findByRole("button", { name: "Guardar ingreso" }));
    expect(screen.getByText("Ingresá un monto mayor a 0")).toBeInTheDocument();
    expect(sent).toHaveLength(0);
  });

  it("lets a hogar member say who received it", async () => {
    handlers();
    signIn({ householdId: hogarSpace.id });
    server.use(
      http.get(`${API}/households`, () => HttpResponse.json([personalSpace, hogarSpace])),
      http.get(`${API}/households/:id/members`, () =>
        HttpResponse.json([
          { userId: "u1", email: "", firstName: "Ana", lastName: "T", role: "owner", joinedAt: "" },
          { userId: "u2", email: "", firstName: "Luis", lastName: "R", role: "member", joinedAt: "" },
        ]),
      ),
    );
    render(<IncomeForm />, { wrapper: WithSWR });
    await userEvent.click(await screen.findByLabelText("Lo recibió"));
    expect(await screen.findByRole("option", { name: "Luis R" })).toBeInTheDocument();
  });
});
