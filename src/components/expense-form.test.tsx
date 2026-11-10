import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ExpenseForm } from "./expense-form";
import { API, requests, resetRequests, server, signIn } from "@/test/msw";
import { hogarSpace, personalSpace, WithSWR } from "@/test/spaces";
import { useHouseholdStore } from "@/stores/household";
import { STORAGE_KEYS } from "@/lib/storage-keys";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, back: vi.fn(), push: vi.fn() }) }));

const cash = {
  id: "pm1", ownerUserId: "u1", name: "Efectivo", kind: "cash",
  allowsInstallments: false, isActive: true, createdAt: "2026-01-01T00:00:00Z",
};
const category = (id: string, householdId: string, name: string) => ({
  id, householdId, name, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z",
});

function api(households: unknown[]) {
  server.use(
    http.get(`${API}/households`, () => HttpResponse.json(households)),
    http.get(`${API}/payment-methods`, () => HttpResponse.json([cash])),
    http.get(`${API}/categories`, ({ request }) =>
      HttpResponse.json(
        request.headers.get("x-household-id") === hogarSpace.id
          ? [category("c-h", hogarSpace.id, "Súper del hogar")]
          : [category("c-p", personalSpace.id, "Mis gustos")],
      ),
    ),
    http.get(`${API}/households/${hogarSpace.id}/members`, () =>
      HttpResponse.json([
        { userId: "u1", email: "ana@example.test", firstName: "Ana", lastName: "Test", role: "owner", joinedAt: "2026-01-01T00:00:00Z" },
        { userId: "u2", email: "beto@example.test", firstName: "Beto", lastName: "Test", role: "member", joinedAt: "2026-01-01T00:00:00Z" },
      ]),
    ),
    http.post(`${API}/expenses`, () => HttpResponse.json({ expense: { id: "e1" }, installments: [], shares: [] }, { status: 201 })),
    // Last: the first matching handler wins.
    http.get(`${API}/*`, () => HttpResponse.json([])),
  );
}

async function fillAndSubmit() {
  await userEvent.type(screen.getByLabelText("Monto"), "1500");
  await userEvent.type(screen.getByLabelText("Descripción"), "Café");
  await userEvent.click(screen.getByLabelText("Pago"));
  await userEvent.click(await screen.findByRole("option", { name: /Efectivo/ }));
  await userEvent.click(screen.getByRole("button", { name: "Guardar gasto" }));
}

const expensePost = () => requests().find((r) => r.method === "POST" && r.path === "/expenses");

beforeEach(() => {
  replace.mockClear();
  resetRequests();
  localStorage.clear();
  signIn({ householdId: personalSpace.id });
});

describe("ExpenseForm spaces (plan 1.2)", () => {
  it("without a hogar there is no Compartido switch and the expense goes to Mi plata", async () => {
    api([personalSpace]);
    render(<ExpenseForm />, { wrapper: WithSWR });
    await screen.findByLabelText("Monto");
    expect(screen.queryByRole("switch", { name: "Compartido" })).not.toBeInTheDocument();

    await fillAndSubmit();
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/movimientos/e1"));
    const post = expensePost()!;
    expect(post.headers.get("x-household-id")).toBe(personalSpace.id);
    await expect.poll(() => JSON.parse(post.body || "{}").isShared).toBe(false);
  });

  it("Compartido sends it to the hogar, with its categories, and is remembered", async () => {
    api([personalSpace, hogarSpace]);
    render(<ExpenseForm />, { wrapper: WithSWR });
    const toggle = await screen.findByRole("switch", { name: "Compartido" });
    expect(toggle).not.toBeChecked();
    expect(screen.getByText("Va a Mi plata. Activalo para sumarlo al Hogar.")).toBeInTheDocument();

    await userEvent.click(toggle);
    expect(screen.getByText(/Va a Casa y se divide/)).toBeInTheDocument();
    expect(localStorage.getItem(STORAGE_KEYS.expenseShared)).toBe("1");
    await userEvent.click(screen.getByLabelText("Categoría"));
    expect(await screen.findByRole("option", { name: "Súper del hogar" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Mis gustos" })).not.toBeInTheDocument();
    await userEvent.keyboard("{Escape}");

    await fillAndSubmit();
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/movimientos/e1"));
    const post = expensePost()!;
    expect(post.headers.get("x-household-id")).toBe(hogarSpace.id);
    await expect.poll(() => JSON.parse(post.body || "{}").isShared).toBe(true);
    // The detail page reads the current space: it switched to the hogar.
    expect(useHouseholdStore.getState().currentId).toBe(hogarSpace.id);
  });

  it("starts with the last choice", async () => {
    localStorage.setItem(STORAGE_KEYS.expenseShared, "1");
    api([personalSpace, hogarSpace]);
    render(<ExpenseForm />, { wrapper: WithSWR });
    expect(await screen.findByRole("switch", { name: "Compartido" })).toBeChecked();
  });
});

describe("ExpenseForm layout (design CargarGasto, plan 1.10b)", () => {
  const visa = {
    id: "visa", ownerUserId: "u1", name: "Visa", kind: "credit",
    allowsInstallments: true, isActive: true, createdAt: "2026-01-01T00:00:00Z",
  };

  function withCard(periods: unknown[]) {
    api([personalSpace]);
    server.use(
      http.get(`${API}/payment-methods`, () => HttpResponse.json([cash, visa])),
      http.get(`${API}/payment-methods/visa/credit-card`, () =>
        HttpResponse.json({ paymentMethodId: "visa", bankId: null, network: "visa", alias: "Visa", lastFour: "4417", defaultClosingDay: 28, defaultDueDay: 8, debitPaymentMethodId: null }),
      ),
      http.get(`${API}/payment-methods/visa/credit-card/periods`, () => HttpResponse.json(periods)),
    );
  }

  it("sends the currency picked next to the amount", async () => {
    api([personalSpace]);
    render(<ExpenseForm />, { wrapper: WithSWR });
    await userEvent.click(await screen.findByRole("radio", { name: "USD" }));
    await fillAndSubmit();
    await waitFor(() => expect(replace).toHaveBeenCalled());
    expect(JSON.parse(expensePost()!.body || "{}")).toMatchObject({ currency: "USD", amount: 1500, description: "Café" });
  });

  it("says which statement the first installment lands in", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true, toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-09T12:00:00-03:00"));
    withCard([{ periodYm: "2026-11", closingDate: "2026-11-28", dueDate: "2026-12-08" }]);
    render(<ExpenseForm />, { wrapper: WithSWR });
    await userEvent.type(await screen.findByLabelText("Monto"), "120000");
    await userEvent.click(screen.getByLabelText("Pago"));
    await userEvent.click(await screen.findByRole("option", { name: /Visa/ }));
    const n = await screen.findByLabelText("Cuotas");
    // Clearing would leave 1 (the minimum) and typing would make it 16.
    fireEvent.change(n, { target: { value: "6" } });
    expect(await screen.findByText(/La primera entra/)).toHaveTextContent("La primera entra en el resumen que cierra el 28/11 y vence el 8/12.");
    expect(screen.getAllByText((_, el) => el?.tagName === "SPAN" && el.textContent?.replace(/\s+/g, " ") === "de $ 20.000")[0]).toBeInTheDocument();
    vi.useRealTimers();
  });

  it("names the month when its dates are not loaded", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true, toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-09T12:00:00-03:00"));
    withCard([]);
    render(<ExpenseForm />, { wrapper: WithSWR });
    await userEvent.click(await screen.findByLabelText("Pago"));
    await userEvent.click(await screen.findByRole("option", { name: /Visa/ }));
    expect(await screen.findByText(/Entra en el resumen/)).toHaveTextContent("Entra en el resumen de noviembre.");
    vi.useRealTimers();
  });

  it("says what is missing", async () => {
    api([personalSpace]);
    render(<ExpenseForm />, { wrapper: WithSWR });
    await userEvent.click(await screen.findByRole("button", { name: "Guardar gasto" }));
    expect(screen.getByText("Ingresá un monto mayor a 0")).toBeInTheDocument();
    expect(screen.getByText("Contá qué compraste")).toBeInTheDocument();
    expect(screen.getByText("Elegí con qué pagaste")).toBeInTheDocument();
    expect(expensePost()).toBeUndefined();
  });
});

describe("ExpenseForm filled in (Cargar compra, plan 4.8)", () => {
  it("starts with the simulated purchase and saves it with a description", async () => {
    api([personalSpace]);
    render(<ExpenseForm initial={{ amount: 1500.5, currency: "USD", paymentMethodId: "pm1", categoryId: "c-p" }} />, {
      wrapper: WithSWR,
    });
    expect(await screen.findByLabelText("Monto")).toHaveValue("1500,5");
    await userEvent.type(screen.getByLabelText("Descripción"), "Heladera");
    await userEvent.click(screen.getByRole("button", { name: "Guardar gasto" }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/movimientos/e1"));
    expect(JSON.parse(expensePost()!.body || "{}")).toMatchObject({
      amount: 1500.5,
      currency: "USD",
      paymentMethodId: "pm1",
      categoryId: "c-p",
      description: "Heladera",
    });
  });
});
