import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InicioHogar, topCategories } from "./inicio-hogar";
import { API, server, signIn } from "@/test/msw";
import { hogarSpace, personalSpace, WithSWR } from "@/test/spaces";

// Inicio · Hogar (design `Hogar`, plan 1.10b). The signed-in user is u1.

vi.mock("@/components/install-prompt", () => ({ InstallPrompt: () => null }));
vi.mock("@/components/push-provider", () => ({ PushProvider: () => null }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), push: vi.fn() }), usePathname: () => "/" }));

const page = (items: unknown[]) => ({ items, totalCount: items.length, limit: 5, offset: 0 });

const members = [
  { userId: "u1", email: "ana@example.test", firstName: "Ana", lastName: "Test", role: "owner", joinedAt: "" },
  { userId: "u2", email: "luis@example.test", firstName: "Luis", lastName: "Rossi", role: "member", joinedAt: "" },
];

const category = (name: string, total: number) => ({ categoryId: name, categoryName: name, total, pct: 0, txCount: 1 });

const expense = (id: string, createdBy: string, description: string, amount: number) => ({
  id,
  householdId: hogarSpace.id,
  createdBy,
  categoryId: null,
  paymentMethodId: "cash",
  amount,
  currency: "ARS",
  amountBase: amount,
  baseCurrency: "ARS",
  description,
  spentAt: "2026-11-02",
  installments: 1,
  isShared: true,
  status: "confirmed",
  createdAt: "2026-11-02T00:00:00Z",
  updatedAt: "2026-11-02T00:00:00Z",
});

type Balances = { owe: unknown[]; owedToMe: unknown[]; net: number };

function handlers({
  balances = { owe: [], owedToMe: [{ from: "u2", to: "u1", amount: 14880 }], net: 14880 } as Balances,
  team = members,
  byCategory = [category("Súper", 133830), category("Servicios", 89220), category("Casa", 57355), category("Otros", 38235)],
} = {}) {
  server.use(
    http.get(`${API}/households`, () => HttpResponse.json([personalSpace, hogarSpace])),
    http.get(`${API}/households/${hogarSpace.id}/members`, () => HttpResponse.json(team)),
    http.get(`${API}/reports/monthly`, () =>
      HttpResponse.json({
        householdId: hogarSpace.id,
        baseCurrency: "ARS",
        month: "2026-11",
        from: "2026-11-01",
        to: "2026-11-30",
        spentThisMonth: 318640,
        billedThisMonth: 0,
        dueThisMonth: 0,
        byCategory,
        fixedVariable: { fixedTotal: 0, variableTotal: 0, fixedPct: 0, variablePct: 0, fixedCount: 0, variableCount: 0 },
        byPayer: [
          { userId: "u2", total: 174200 },
          { userId: "u1", total: 144440 },
        ],
      }),
    ),
    http.get(`${API}/balances/me`, () => HttpResponse.json({ userId: "u1", ...balances })),
    http.get(`${API}/expenses`, () =>
      HttpResponse.json(page([expense("e1", "u1", "Súper", 42315), expense("e2", "u2", "Luz", 38900)])),
    ),
    http.get(`${API}/expenses/drafts`, () => HttpResponse.json([])),
    http.get(`${API}/recurring-expenses`, () => HttpResponse.json([])),
  );
}

beforeEach(() => signIn({ householdId: hogarSpace.id }));

describe("InicioHogar", () => {
  it("shows the hogar, the shared total and what each one put", async () => {
    handlers();
    render(<InicioHogar />, { wrapper: WithSWR });
    expect(await screen.findByText("· vos y Luis", { exact: false })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Casa · vos y Luis");
    expect(screen.getByLabelText("Invitar")).toHaveAttribute("href", "/hogar");
    const hero = await screen.findByRole("region", { name: "Gastaron juntos en noviembre" });
    expect(within(hero).getByText("$ 318.640")).toBeInTheDocument();
    // Me first, then the others.
    const labels = within(hero).getAllByRole("term").map((t) => t.textContent);
    expect(labels).toEqual(["Pusiste vos", "Puso Luis"]);
    expect(within(hero).getByText("$ 144.440")).toBeInTheDocument();
    expect(within(hero).getByText("$ 174.200")).toBeInTheDocument();
  });

  it("says who owes whom and registers the payment", async () => {
    handlers();
    let paid: unknown;
    server.use(
      http.post(`${API}/settlements`, async ({ request }) => {
        paid = await request.json();
        return HttpResponse.json({ id: "s1" }, { status: 201 });
      }),
    );
    render(<InicioHogar />, { wrapper: WithSWR });
    const owed = await screen.findByText(/Luis te debe/);
    expect(owed).toHaveTextContent("Luis te debe $ 14.880");
    expect(screen.getByText("Luis te transfiere y quedan en cero.")).toBeInTheDocument();
    expect(screen.getByText("Ver detalle")).toHaveAttribute("href", "/deudas");

    await userEvent.click(screen.getByRole("button", { name: "Registrar pago" }));
    const dialog = await screen.findByRole("dialog");
    await userEvent.click(within(dialog).getByRole("button", { name: "Confirmar pago" }));
    await vi.waitFor(() => expect(paid).toMatchObject({ fromUser: "u2", toUser: "u1", amount: 14880 }));
  });

  it("says when I owe", async () => {
    handlers({ balances: { owe: [{ from: "u1", to: "u2", amount: 500 }], owedToMe: [], net: -500 } });
    render(<InicioHogar />, { wrapper: WithSWR });
    expect(await screen.findByText(/Le debés a Luis/)).toHaveTextContent("Le debés a Luis $ 500");
  });

  it("says when they are even", async () => {
    handlers({ balances: { owe: [], owedToMe: [], net: 0 } });
    render(<InicioHogar />, { wrapper: WithSWR });
    expect(await screen.findByText("Están al día")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Registrar pago" })).not.toBeInTheDocument();
  });

  it("hides the accounts while alone in the hogar", async () => {
    handlers({ team: [members[0]] });
    render(<InicioHogar />, { wrapper: WithSWR });
    expect(await screen.findByText("· solo vos", { exact: false })).toBeInTheDocument();
    expect(screen.queryByText("Cuentas entre ustedes")).not.toBeInTheDocument();
  });

  it("shows where the money went, the first bar highlighted", async () => {
    handlers();
    render(<InicioHogar />, { wrapper: WithSWR });
    expect(await screen.findByText("En qué se fue")).toBeInTheDocument();
    const bars = screen.getAllByTestId("category-bar");
    expect(bars).toHaveLength(4);
    expect(bars[0]).toHaveClass("bg-brand");
    expect(bars[0]).toHaveStyle({ width: "100%" });
    expect(bars[1]).toHaveClass("bg-ink-muted");
  });

  it("says who paid each shared expense", async () => {
    handlers();
    render(<InicioHogar />, { wrapper: WithSWR });
    const súper = await screen.findByRole("link", { name: /Súper/ });
    expect(súper).toHaveTextContent("Pagaste vos");
    expect(súper).toHaveAttribute("href", "/movimientos/e1");
    expect(screen.getByRole("link", { name: /Luz/ })).toHaveTextContent("Pagó Luis");
  });
});

describe("topCategories", () => {
  it("keeps up to four and folds the rest into Otros", () => {
    const four = [category("A", 4), category("B", 3), category("C", 2), category("D", 1)];
    expect(topCategories(four).map((c) => c.name)).toEqual(["A", "B", "C", "D"]);
    const six = [...four, category("E", 1), category("F", 1)];
    expect(topCategories(six)).toEqual([
      { name: "A", total: 4 },
      { name: "B", total: 3 },
      { name: "C", total: 2 },
      { name: "Otros", total: 3 },
    ]);
  });
});
