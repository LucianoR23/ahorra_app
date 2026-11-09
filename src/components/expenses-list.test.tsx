import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ExpensesList, groupByDay, PAGE } from "./expenses-list";
import type { Expense } from "@/lib/api/schemas";
import { API, server, signIn } from "@/test/msw";
import { personalSpace, WithSWR } from "@/test/spaces";

// Movimientos (design `Movimientos`, plan 1.10b).

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), push: vi.fn() }), usePathname: () => "/movimientos" }));

function expense(id: string, over: Partial<Expense> = {}): Expense {
  return {
    id,
    householdId: personalSpace.id,
    createdBy: "u1",
    categoryId: "food",
    paymentMethodId: "visa",
    amount: 2500,
    currency: "ARS",
    amountBase: 2500,
    baseCurrency: "ARS",
    description: `Gasto ${id}`,
    spentAt: "2026-11-09",
    installments: 1,
    isShared: false,
    status: "confirmed",
    createdAt: "2026-11-09T00:00:00Z",
    updatedAt: "2026-11-09T00:00:00Z",
    ...over,
  } as Expense;
}

const list = [
  expense("cafe", { description: "Café", amount: 2500, amountBase: 2500 }),
  expense("super", { description: "Súper", amount: 21158, amountBase: 21158 }),
  expense("heladera", { description: "Heladera", amount: 89990, amountBase: 89990, spentAt: "2026-11-08", installments: 12, categoryId: "home" }),
  expense("netflix", { description: "Netflix", amount: 9.99, currency: "USD", amountBase: 15110, spentAt: "2026-11-02", categoryId: null }),
];

let requests: URL[] = [];

function handlers(items: Expense[] = list, totalCount = items.length) {
  requests = [];
  server.use(
    http.get(`${API}/households`, () => HttpResponse.json([personalSpace])),
    http.get(`${API}/categories`, () =>
      HttpResponse.json([
        { id: "food", householdId: personalSpace.id, name: "Comida", icon: "coffee", color: null, parentId: null },
        { id: "home", householdId: personalSpace.id, name: "Casa", icon: "home", color: null, parentId: null },
        { id: "light", householdId: personalSpace.id, name: "Luz", icon: "zap", color: null, parentId: "home" },
      ]),
    ),
    http.get(`${API}/payment-methods`, () =>
      HttpResponse.json([{ id: "visa", ownerUserId: "u1", name: "Visa", kind: "credit", allowsInstallments: true, isActive: true, createdAt: "" }]),
    ),
    http.get(`${API}/expenses`, ({ request }) => {
      const url = new URL(request.url);
      requests.push(url);
      const limit = Number(url.searchParams.get("limit"));
      return HttpResponse.json({ items: items.slice(0, limit), totalCount, totalAmountBase: 486320, limit, offset: 0 });
    }),
  );
}

const lastQuery = () => requests.at(-1)!.searchParams;

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true, toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-09T12:00:00-03:00"));
  signIn({ householdId: personalSpace.id });
});

describe("ExpensesList", () => {
  it("shows the month with its total and count", async () => {
    handlers(list, 38);
    render(<ExpensesList />, { wrapper: WithSWR });
    expect(await screen.findByText(/Gastaste/)).toHaveTextContent("Gastaste $ 486.320 · 38 gastos");
    expect(screen.getByText("Noviembre 2026", { exact: false })).toBeInTheDocument();
    expect(lastQuery().get("from")).toBe("2026-11-01");
    expect(lastQuery().get("to")).toBe("2026-11-30");
  });

  it("groups by day with each day's total", async () => {
    handlers();
    render(<ExpensesList />, { wrapper: WithSWR });
    const today = await screen.findByRole("region", { name: "Hoy" });
    expect(within(today).getByText("$ 23.658")).toBeInTheDocument();
    expect(within(today).getAllByRole("link")).toHaveLength(2);
    expect(within(today).getByRole("link", { name: /Café/ })).toHaveTextContent("Comida · Visa");

    const yesterday = screen.getByRole("region", { name: "Ayer" });
    expect(within(yesterday).getByRole("link", { name: /Heladera/ })).toHaveTextContent("12 cuotas · Visa");

    // A dollar expense shows the dollars and what it is in pesos.
    const netflix = screen.getByRole("link", { name: /Netflix/ });
    expect(netflix).toHaveTextContent("Sin categoría · Visa · ≈ $ 15.110");
    expect(netflix).toHaveTextContent("US$ 9,99");
    expect(netflix).toHaveAttribute("href", "/movimientos/netflix");
  });

  it("filters with the chips", async () => {
    handlers();
    render(<ExpensesList />, { wrapper: WithSWR });
    await screen.findByRole("region", { name: "Hoy" });
    expect(screen.getByRole("button", { name: "Todos" })).toHaveAttribute("aria-pressed", "true");

    await userEvent.click(screen.getByRole("button", { name: "Fijos" }));
    await vi.waitFor(() => expect(lastQuery().get("kind")).toBe("fixed"));
    expect(screen.getByRole("button", { name: "Fijos" })).toHaveAttribute("aria-pressed", "true");

    await userEvent.click(screen.getByRole("button", { name: "Categoría" }));
    await userEvent.click(await screen.findByRole("menuitemradio", { name: "Luz" }));
    await vi.waitFor(() => expect(lastQuery().get("categoryId")).toBe("light"));
    expect(screen.getByRole("button", { name: "Categoría: Luz" })).toHaveTextContent("Luz");
  });

  it("searches by description", async () => {
    handlers();
    render(<ExpensesList />, { wrapper: WithSWR });
    await screen.findByRole("region", { name: "Hoy" });
    await userEvent.click(screen.getByRole("button", { name: "Buscar" }));
    await userEvent.type(screen.getByLabelText("Buscar movimientos"), "netf");
    await vi.waitFor(() => expect(lastQuery().get("q")).toBe("netf"));
    await userEvent.click(screen.getByRole("button", { name: "Cerrar búsqueda" }));
    expect(screen.queryByLabelText("Buscar movimientos")).not.toBeInTheDocument();
  });

  it("loads more rows", async () => {
    handlers(list, 120);
    render(<ExpensesList />, { wrapper: WithSWR });
    await screen.findByRole("region", { name: "Hoy" });
    expect(lastQuery().get("limit")).toBe(String(PAGE));
    await userEvent.click(screen.getByRole("button", { name: "Cargar más" }));
    await vi.waitFor(() => expect(lastQuery().get("limit")).toBe(String(PAGE * 2)));
  });

  it("says when the month is empty", async () => {
    handlers([]);
    render(<ExpensesList />, { wrapper: WithSWR });
    expect(await screen.findByText("No cargaste gastos este mes.")).toBeInTheDocument();
  });
});

describe("groupByDay", () => {
  it("keeps the order and adds each day in the base currency", () => {
    const groups = groupByDay(list);
    expect(groups.map((g) => [g.day, g.total, g.items.length])).toEqual([
      ["2026-11-09", 23658, 2],
      ["2026-11-08", 89990, 1],
      ["2026-11-02", 15110, 1],
    ]);
  });
});
