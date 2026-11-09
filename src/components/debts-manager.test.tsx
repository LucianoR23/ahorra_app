import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DebtsManager } from "./debts-manager";
import { confirm } from "@/lib/confirm";
import { API, requests, server, signIn } from "@/test/msw";
import { hogarSpace, personalSpace, WithSWR } from "@/test/spaces";

// Cuentas entre ustedes (plan 1.10b, the Movimientos list).

vi.mock("@/lib/confirm", () => ({ confirm: vi.fn() }));

const settlement = {
  id: "s1",
  householdId: "h1",
  fromUser: "u2",
  toUser: "u1",
  amount: 5000,
  baseCurrency: "ARS",
  note: "Transferencia",
  paidAt: "2026-11-02",
  createdAt: "2026-11-02T12:00:00Z",
};

function handlers({ settlements = [settlement] as unknown[] | null, debts = [{ from: "u2", to: "u1", amount: 14880 }] as unknown[] | null } = {}) {
  server.use(
    http.get(`${API}/households`, () => HttpResponse.json([personalSpace, hogarSpace])),
    http.get(`${API}/households/:id/members`, () =>
      HttpResponse.json([
        { userId: "u1", email: "", firstName: "Ana", lastName: "T", role: "owner", joinedAt: "" },
        { userId: "u2", email: "", firstName: "Luis", lastName: "R", role: "member", joinedAt: "" },
      ]),
    ),
    http.get(`${API}/balances`, () => HttpResponse.json({ householdId: "h1", balances: debts })),
    http.get(`${API}/balances/me`, () => HttpResponse.json({ userId: "u1", owe: [], owedToMe: debts ?? [], net: 14880 })),
    http.get(`${API}/settlements`, () => HttpResponse.json({ items: settlements, totalCount: settlements?.length ?? 0, limit: 50, offset: 0 })),
    http.post(`${API}/settlements`, () => HttpResponse.json(settlement, { status: 201 })),
    http.delete(`${API}/settlements/s1`, () => new HttpResponse(null, { status: 204 })),
  );
}

beforeEach(() => {
  signIn({ householdId: hogarSpace.id });
  vi.mocked(confirm).mockReset();
});

describe("DebtsManager", () => {
  it("shows what they owe you and who owes whom, in plain words", async () => {
    handlers();
    render(<DebtsManager />, { wrapper: WithSWR });
    expect(await screen.findByText("Te deben")).toBeInTheDocument();
    const debts = screen.getByRole("region", { name: "Lo que se deben" });
    expect(await within(debts).findByText("Luis te debe")).toBeInTheDocument();
    expect(within(debts).getByText("$ 14.880")).toBeInTheDocument();
    const payments = screen.getByRole("region", { name: "Pagos" });
    expect(within(payments).getByRole("button", { name: /Luis te pagó/ })).toHaveTextContent("Transferencia");
  });

  it("registers a payment for less than the debt, not more", async () => {
    handlers();
    render(<DebtsManager />, { wrapper: WithSWR });
    await userEvent.click(await screen.findByRole("button", { name: "Pagar" }));
    const sheet = await screen.findByRole("dialog", { name: "Registrar pago" });
    const amount = within(sheet).getByLabelText("Monto");
    await userEvent.clear(amount);
    await userEvent.type(amount, "20000");
    expect(within(sheet).getByText("No puede ser más que la deuda.")).toBeInTheDocument();
    expect(within(sheet).getByRole("button", { name: "Confirmar pago" })).toBeDisabled();
    await userEvent.clear(amount);
    await userEvent.type(amount, "4880");
    await userEvent.click(within(sheet).getByRole("button", { name: "Confirmar pago" }));
    await waitFor(() => {
      const r = requests().find((x) => x.method === "POST" && x.path === "/settlements");
      expect(r && JSON.parse(r.body)).toMatchObject({ fromUser: "u2", toUser: "u1", amount: 4880 });
    });
  });

  it("opens a payment and deletes it after confirming", async () => {
    handlers();
    vi.mocked(confirm).mockResolvedValue(true);
    render(<DebtsManager />, { wrapper: WithSWR });
    await userEvent.click(await screen.findByRole("button", { name: /Luis te pagó/ }));
    const sheet = await screen.findByRole("dialog", { name: "Pago" });
    expect(within(sheet).getByText("$ 5.000")).toBeInTheDocument();
    await userEvent.click(within(sheet).getByRole("button", { name: "Eliminar pago" }));
    await waitFor(() => expect(requests().some((r) => r.method === "DELETE" && r.path === "/settlements/s1")).toBe(true));
  });

  it("survives empty lists sent as null", async () => {
    handlers({ settlements: null, debts: null });
    render(<DebtsManager />, { wrapper: WithSWR });
    expect(await screen.findByText("Todo saldado. Nadie le debe nada a nadie.")).toBeInTheDocument();
    expect(await screen.findByText("Todavía no registraron pagos")).toBeInTheDocument();
  });

  it("filters the payments by person", async () => {
    handlers();
    render(<DebtsManager />, { wrapper: WithSWR });
    await userEvent.click(await screen.findByRole("button", { name: "Con Luis" }));
    await waitFor(() => expect(requests().some((r) => r.path === "/settlements" && r.query.withUser === "u2")).toBe(true));
  });
});
