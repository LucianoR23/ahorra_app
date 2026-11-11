import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it } from "vitest";
import { DueCalendar } from "./due-calendar";
import { API, requests, resetRequests, server, signIn } from "@/test/msw";
import { personalSpace, WithSWR } from "@/test/spaces";
import { isoToday, shiftMonth } from "@/lib/format";
import { useDiscreetStore } from "@/stores/discreet";

// Vencimientos (plan 7.2).

const visa = { id: "visa", ownerUserId: "u1", name: "Visa Galicia", kind: "credit", allowsInstallments: true, isActive: true, createdAt: "" };
const cash = { id: "cash", ownerUserId: "u1", name: "Efectivo", kind: "cash", allowsInstallments: false, isActive: true, createdAt: "" };

function events(month: string) {
  const day = (d: number) => `${month}-${String(d).padStart(2, "0")}`;
  return [
    { date: day(1), kind: "recurring_income", title: "Sueldo", amount: 1500, currency: "USD", recurringId: "ri1" },
    {
      date: day(3), kind: "card_due", title: "Visa Galicia", paymentMethodId: "visa", periodYm: shiftMonth(month, -1),
      totals: [{ currency: "ARS", amount: 145000 }, { currency: "USD", amount: 20 }], status: "overdue", installmentCount: 4,
    },
    { date: day(3), kind: "recurring_expense", title: "Luz", amount: 30000, currency: "ARS", paymentMethodId: "cash", categoryId: "c1", recurringId: "re1", variable: true },
    { date: day(24), kind: "card_closing", title: "Visa Galicia", paymentMethodId: "visa", periodYm: month },
  ];
}

function api(empty = false) {
  server.use(
    http.get(`${API}/households`, () => HttpResponse.json([personalSpace])),
    http.get(`${API}/calendar`, ({ request }) => {
      const month = new URL(request.url).searchParams.get("month") ?? "";
      return HttpResponse.json({ month, events: empty ? [] : events(month) });
    }),
    http.get(`${API}/payment-methods`, () => HttpResponse.json([visa, cash])),
    http.get(`${API}/categories`, () =>
      HttpResponse.json([{ id: "c1", householdId: personalSpace.id, name: "Servicios", icon: "zap", color: null, parentId: null }]),
    ),
  );
}

beforeEach(() => {
  resetRequests();
  useDiscreetStore.setState({ hidden: false });
  signIn({ householdId: personalSpace.id });
});

const month = isoToday().slice(0, 7);
const lastMonthAsked = () => {
  const r = requests().filter((x) => x.path === "/calendar").at(-1);
  return r ? new URLSearchParams(r.query).get("month") : null;
};

describe("DueCalendar (plan 7.2)", () => {
  it("lists the month day by day: income, card due, recurring expense, closing", async () => {
    api();
    render(<DueCalendar />, { wrapper: WithSWR });
    expect(await screen.findByText("Sueldo")).toBeInTheDocument();
    expect(lastMonthAsked()).toBe(month);

    const rows = screen.getAllByRole("link");
    expect(rows.map((r) => r.getAttribute("href"))).toEqual([
      "/recurrentes",
      `/tarjetas/visa/resumen/${shiftMonth(month, -1)}`,
      "/recurrentes",
      `/tarjetas/visa/resumen/${month}`,
    ]);
    expect(rows[0]).toHaveTextContent("SueldoIngreso fijo+ US$ 1.500");
    expect(rows[1]).toHaveTextContent("Vence el resumen · 4 cuotas · Vencido");
    expect(within(rows[1]).getByText("$ 145.000")).toBeInTheDocument();
    expect(within(rows[1]).getByText("US$ 20")).toBeInTheDocument();
    expect(rows[2]).toHaveTextContent("Servicios · Efectivo · monto estimado");
    expect(rows[3]).toHaveTextContent("Cierra el resumen: lo que compres después va al siguiente");
    // Three days with something: the 1st, the 3rd and the 24th.
    expect(screen.getAllByRole("region").length).toBe(3);
  });

  it("shows only the day picked, and the whole month again", async () => {
    api();
    render(<DueCalendar />, { wrapper: WithSWR });
    await screen.findByText("Sueldo");

    await userEvent.click(screen.getByRole("button", { name: new RegExp(`\\b3 de `) }));
    expect(screen.queryByText("Sueldo")).not.toBeInTheDocument();
    expect(screen.getByText("Luz")).toBeInTheDocument();
    expect(screen.getAllByRole("link")).toHaveLength(2);

    await userEvent.click(screen.getByRole("button", { name: new RegExp(`\\b2 de `) }));
    expect(screen.getByText("Nada este día")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Ver todo el mes" }));
    expect(screen.getByText("Sueldo")).toBeInTheDocument();
  });

  it("moves between months and forgets the day picked", async () => {
    api();
    render(<DueCalendar />, { wrapper: WithSWR });
    await screen.findByText("Sueldo");
    await userEvent.click(screen.getByRole("button", { name: new RegExp(`\\b3 de `) }));

    await userEvent.click(screen.getByRole("button", { name: "Mes siguiente" }));
    expect(await screen.findByText("Sueldo")).toBeInTheDocument();
    expect(lastMonthAsked()).toBe(shiftMonth(month, 1));
    expect(screen.queryByRole("button", { name: "Ver todo el mes" })).not.toBeInTheDocument();
  });

  it("says when the month is empty", async () => {
    api(true);
    render(<DueCalendar />, { wrapper: WithSWR });
    expect(await screen.findByText("Nada este mes")).toBeInTheDocument();
  });

  it("says when it cannot load", async () => {
    server.use(
      http.get(`${API}/households`, () => HttpResponse.json([personalSpace])),
      http.get(`${API}/calendar`, () => HttpResponse.json({ error: { code: "internal", message: "boom" } }, { status: 500 })),
      http.get(`${API}/payment-methods`, () => HttpResponse.json([])),
      http.get(`${API}/categories`, () => HttpResponse.json([])),
    );
    render(<DueCalendar />, { wrapper: WithSWR });
    expect(await screen.findByRole("alert")).toHaveTextContent("No pudimos cargar los vencimientos");
  });
});
