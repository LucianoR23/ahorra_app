import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RecurringManager } from "./recurring-manager";
import { confirm } from "@/lib/confirm";
import { API, requests, server, signIn } from "@/test/msw";
import { personalSpace, WithSWR } from "@/test/spaces";

// Recurrentes (plan 1.10b: list + sheet). The form rules come from the old
// screen: a monthly series is charged on its start date's day, a variable
// bill is always 1 installment, and the start date only goes on create.

vi.mock("@/lib/confirm", () => ({ confirm: vi.fn() }));

const rexp = (id: string, over: Record<string, unknown> = {}) => ({
  id,
  householdId: personalSpace.id,
  createdBy: "u1",
  categoryId: "luz",
  paymentMethodId: "visa",
  amount: 12000,
  currency: "ARS",
  description: "Netflix",
  installments: 1,
  isShared: false,
  frequency: "monthly",
  dayOfMonth: 10,
  dayOfWeek: null,
  monthOfYear: null,
  isActive: true,
  startsAt: "2026-10-10",
  endsAt: null,
  lastGenerated: "2026-11-10",
  createdAt: "2026-10-01T00:00:00Z",
  amountIsVariable: false,
  lastAmount: null,
  ...over,
});

const rinc = (id: string, over: Record<string, unknown> = {}) => ({
  id,
  householdId: personalSpace.id,
  receivedBy: "u1",
  paymentMethodId: null,
  amount: 1151143,
  currency: "ARS",
  description: "Sueldo",
  source: "salary",
  frequency: "monthly",
  dayOfMonth: 5,
  isActive: true,
  startsAt: "2026-10-05",
  endsAt: null,
  lastGenerated: null,
  createdAt: "2026-10-01T00:00:00Z",
  ...over,
});

const expenses = [rexp("r1"), rexp("r2", { description: "Luz", amountIsVariable: true, lastAmount: 31500, isActive: false })];

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true, toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-09T12:00:00-03:00"));
  signIn({ householdId: personalSpace.id });
  vi.mocked(confirm).mockReset();
  server.use(
    http.get(`${API}/households`, () => HttpResponse.json([personalSpace])),
    http.get(`${API}/recurring-expenses`, () => HttpResponse.json(expenses)),
    http.get(`${API}/recurring-expenses/:id`, ({ params }) => HttpResponse.json(expenses.find((e) => e.id === params.id))),
    http.get(`${API}/recurring-incomes`, () => HttpResponse.json([rinc("i1")])),
    http.get(`${API}/recurring-incomes/:id`, () => HttpResponse.json(rinc("i1"))),
    http.get(`${API}/categories`, () =>
      HttpResponse.json([{ id: "luz", householdId: personalSpace.id, parentId: null, name: "Servicios", icon: "zap", color: null, createdAt: "", updatedAt: "" }]),
    ),
    http.get(`${API}/payment-methods`, () =>
      HttpResponse.json([
        { id: "visa", ownerUserId: "u1", name: "Visa", kind: "credit", allowsInstallments: true, isActive: true, createdAt: "" },
        { id: "cuenta", ownerUserId: "u1", name: "Galicia", kind: "debit", allowsInstallments: false, isActive: true, createdAt: "" },
      ]),
    ),
    http.post(`${API}/recurring-expenses`, () => HttpResponse.json(rexp("new"), { status: 201 })),
    http.patch(`${API}/recurring-expenses/:id`, () => HttpResponse.json(rexp("r1"))),
    http.patch(`${API}/recurring-expenses/:id/active`, () => new HttpResponse(null, { status: 204 })),
    http.delete(`${API}/recurring-expenses/:id`, () => new HttpResponse(null, { status: 204 })),
    http.post(`${API}/recurring-incomes`, () => HttpResponse.json(rinc("new"), { status: 201 })),
  );
});

function body(method: string, path: string) {
  const req = requests().filter((r) => r.method === method && r.path === path).at(-1);
  return req ? JSON.parse(req.body) : undefined;
}

describe("RecurringManager", () => {
  it("lists the fixed expenses with when they charge, and a variable one with its last bill", async () => {
    render(<RecurringManager />, { wrapper: WithSWR });
    const netflix = await screen.findByRole("button", { name: "Editar Netflix" });
    expect(netflix).toHaveTextContent("Día 10");
    expect(await within(netflix).findByText(/Visa/)).toBeInTheDocument();
    expect(netflix).toHaveTextContent("$ 12.000");
    const luz = screen.getByRole("button", { name: "Editar Luz" });
    expect(luz).toHaveTextContent("Variable");
    expect(luz).toHaveTextContent("Pausado");
    expect(luz).toHaveTextContent("$ 31.500");
    expect(luz).toHaveTextContent("último");
  });

  it("switches to the fixed incomes", async () => {
    render(<RecurringManager />, { wrapper: WithSWR });
    await userEvent.click(await screen.findByRole("tab", { name: "Ingresos fijos" }));
    const sueldo = await screen.findByRole("button", { name: "Editar Sueldo" });
    expect(sueldo).toHaveTextContent("+ $ 1.151.143");
    expect(screen.getByRole("button", { name: "Nuevo ingreso fijo" })).toBeInTheDocument();
  });

  it("creates a monthly expense charged on its start date's day", async () => {
    render(<RecurringManager />, { wrapper: WithSWR });
    await userEvent.click(await screen.findByRole("button", { name: "Nuevo gasto fijo" }));
    const sheet = await screen.findByRole("dialog", { name: "Nuevo gasto fijo" });
    await userEvent.type(within(sheet).getByLabelText("Descripción"), "Spotify");
    await userEvent.type(within(sheet).getByLabelText("Monto"), "4500");
    await userEvent.click(within(sheet).getByLabelText("Pago"));
    await userEvent.click(await screen.findByRole("option", { name: "Visa" }));
    fireEvent.change(within(sheet).getByLabelText("Cuotas por cargo"), { target: { value: "3" } });
    expect(within(sheet).getByText(/Se carga el día/)).toHaveTextContent("Se carga el día 9 de cada mes");
    await userEvent.click(within(sheet).getByRole("button", { name: "Crear gasto fijo" }));
    await waitFor(() =>
      expect(body("POST", "/recurring-expenses")).toMatchObject({
        description: "Spotify",
        amount: 4500,
        paymentMethodId: "visa",
        installments: 3,
        frequency: "monthly",
        dayOfMonth: 9,
        startsAt: "2026-11-09",
        amountIsVariable: false,
      }),
    );
  });

  it("a variable bill always goes in one installment", async () => {
    render(<RecurringManager />, { wrapper: WithSWR });
    await userEvent.click(await screen.findByRole("button", { name: "Nuevo gasto fijo" }));
    const sheet = await screen.findByRole("dialog");
    await userEvent.type(within(sheet).getByLabelText("Descripción"), "Expensas");
    await userEvent.type(within(sheet).getByLabelText("Monto"), "90000");
    await userEvent.click(within(sheet).getByLabelText("Pago"));
    await userEvent.click(await screen.findByRole("option", { name: "Visa" }));
    fireEvent.change(within(sheet).getByLabelText("Cuotas por cargo"), { target: { value: "6" } });
    await userEvent.click(within(sheet).getByRole("switch", { name: "Importe variable" }));
    expect(within(sheet).getByLabelText("Monto estimado")).toBeInTheDocument();
    expect(within(sheet).queryByLabelText("Cuotas por cargo")).not.toBeInTheDocument();
    await userEvent.click(within(sheet).getByRole("button", { name: "Crear gasto fijo" }));
    await waitFor(() => expect(body("POST", "/recurring-expenses")).toMatchObject({ installments: 1, amountIsVariable: true }));
  });

  it("says what is missing", async () => {
    render(<RecurringManager />, { wrapper: WithSWR });
    await userEvent.click(await screen.findByRole("button", { name: "Nuevo gasto fijo" }));
    const sheet = await screen.findByRole("dialog");
    await userEvent.click(within(sheet).getByRole("button", { name: "Crear gasto fijo" }));
    expect(within(sheet).getByRole("alert")).toHaveTextContent("Completá descripción, monto y con qué pagás");
    expect(requests().some((r) => r.method === "POST")).toBe(false);
  });

  it("edits without sending the start date, which can't change", async () => {
    render(<RecurringManager />, { wrapper: WithSWR });
    await userEvent.click(await screen.findByRole("button", { name: "Editar Netflix" }));
    const sheet = await screen.findByRole("dialog", { name: "Editar gasto fijo" });
    const amount = await within(sheet).findByLabelText("Monto");
    await userEvent.clear(amount);
    await userEvent.type(amount, "13500");
    await userEvent.click(within(sheet).getByRole("button", { name: "Guardar" }));
    await waitFor(() => expect(body("PATCH", "/recurring-expenses/r1")).toMatchObject({ amount: 13500, dayOfMonth: 10 }));
    expect(body("PATCH", "/recurring-expenses/r1")).not.toHaveProperty("startsAt");
  });

  it("pauses and deletes from the sheet", async () => {
    vi.mocked(confirm).mockResolvedValue(true);
    render(<RecurringManager />, { wrapper: WithSWR });
    await userEvent.click(await screen.findByRole("button", { name: "Editar Netflix" }));
    await userEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Pausar" }));
    await waitFor(() => expect(body("PATCH", "/recurring-expenses/r1/active")).toEqual({ isActive: false }));

    await userEvent.click(await screen.findByRole("button", { name: "Editar Netflix" }));
    await userEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Eliminar gasto fijo" }));
    expect(vi.mocked(confirm).mock.calls[0][0].description).toBe("Los gastos que ya generó no se eliminan.");
    await waitFor(() => expect(requests().some((r) => r.method === "DELETE" && r.path === "/recurring-expenses/r1")).toBe(true));
  });

  it("creates a weekly income on the chosen weekday", async () => {
    render(<RecurringManager />, { wrapper: WithSWR });
    await userEvent.click(await screen.findByRole("tab", { name: "Ingresos fijos" }));
    await userEvent.click(await screen.findByRole("button", { name: "Nuevo ingreso fijo" }));
    const sheet = await screen.findByRole("dialog", { name: "Nuevo ingreso fijo" });
    await userEvent.type(within(sheet).getByLabelText("Monto"), "50000");
    await userEvent.click(within(sheet).getByRole("radio", { name: "Semanal" }));
    await userEvent.click(within(sheet).getByLabelText("Día de la semana"));
    await userEvent.click(await screen.findByRole("option", { name: "Viernes" }));
    await userEvent.click(within(sheet).getByRole("button", { name: "Crear ingreso fijo" }));
    await waitFor(() =>
      expect(body("POST", "/recurring-incomes")).toMatchObject({ amount: 50000, source: "salary", frequency: "weekly", dayOfWeek: 5, dayOfMonth: null }),
    );
  });

  it("invites to add one when there are none", async () => {
    server.use(http.get(`${API}/recurring-expenses`, () => HttpResponse.json([])));
    render(<RecurringManager />, { wrapper: WithSWR });
    expect(await screen.findByText("Todavía no tenés gastos fijos")).toBeInTheDocument();
  });
});
