import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ExpenseDetailView, installmentProgress, visibleInstallments } from "./expense-detail";
import type { Installment } from "@/lib/api/schemas";
import { confirm } from "@/lib/confirm";
import { API, server, signIn } from "@/test/msw";
import { hogarSpace, personalSpace, WithSWR } from "@/test/spaces";

// Detalle (design `Detalle`, plan 1.10b).

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, push: vi.fn() }), usePathname: () => "/movimientos/e1" }));
vi.mock("@/lib/confirm", () => ({ confirm: vi.fn() }));
vi.mock("@/components/ui/info-help", () => ({ InfoHelp: () => null }));

/** Installment n is billed on the 24th of month 9 + n (October for the first). */
function installment(n: number, over: Partial<Installment> = {}): Installment {
  const at = 9 + n;
  const year = at > 12 ? "2027" : "2026";
  const m = String(at > 12 ? at - 12 : at).padStart(2, "0");
  return {
    id: `i${n}`,
    expenseId: "e1",
    installmentNumber: n,
    installmentAmount: 89990,
    installmentAmountBase: 89990,
    billingDate: `${year}-${m}-24`,
    dueDate: `${year}-${m}-28`,
    isPaid: false,
    shares: [],
    ...over,
  };
}

const twelve = Array.from({ length: 12 }, (_, i) => installment(i + 1, { isPaid: i < 2 }));

const expense = {
  id: "e1",
  householdId: personalSpace.id,
  createdBy: "u1",
  categoryId: "home",
  paymentMethodId: "visa",
  amount: 1079880,
  currency: "ARS",
  amountBase: 1079880,
  baseCurrency: "ARS",
  description: "Heladera",
  spentAt: "2026-08-15",
  installments: 12,
  isShared: false,
  status: "confirmed",
  createdAt: "2026-08-15T00:00:00Z",
  updatedAt: "2026-08-15T00:00:00Z",
};

let patched: { path: string; body: unknown }[] = [];

function handlers(detail: { expense: Record<string, unknown>; installments: Installment[] } = { expense, installments: twelve }) {
  patched = [];
  server.use(
    http.get(`${API}/households`, () => HttpResponse.json([personalSpace, hogarSpace])),
    http.get(`${API}/households/:id/members`, () =>
      HttpResponse.json([
        { userId: "u1", email: "", firstName: "Ana", lastName: "T", role: "owner", joinedAt: "" },
        { userId: "u2", email: "", firstName: "Luis", lastName: "R", role: "member", joinedAt: "" },
      ]),
    ),
    http.get(`${API}/expenses/e1`, () => HttpResponse.json(detail)),
    http.get(`${API}/categories`, () =>
      HttpResponse.json([{ id: "home", householdId: personalSpace.id, name: "Hogar", icon: "home", color: null, parentId: null }]),
    ),
    http.get(`${API}/payment-methods`, () =>
      HttpResponse.json([{ id: "visa", ownerUserId: "u1", name: "Visa 4417", kind: "credit", allowsInstallments: true, isActive: true, createdAt: "" }]),
    ),
    http.patch(`${API}/expenses/e1`, async ({ request }) => {
      patched.push({ path: "expense", body: await request.json() });
      return HttpResponse.json(expense);
    }),
    http.patch(`${API}/expenses/e1/installments/:n`, async ({ request, params }) => {
      patched.push({ path: `installment ${params.n}`, body: await request.json() });
      return HttpResponse.json(twelve[0]);
    }),
    http.delete(`${API}/expenses/e1`, () => {
      patched.push({ path: "delete", body: null });
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

describe("ExpenseDetailView", () => {
  it("shows the expense and its data", async () => {
    handlers();
    render(<ExpenseDetailView id="e1" />, { wrapper: WithSWR });
    expect(await screen.findByRole("heading", { name: "Heladera" })).toBeInTheDocument();
    expect(screen.getByText("$ 1.079.880")).toBeInTheDocument();
    expect(screen.getByText(/12 cuotas de/)).toHaveTextContent("12 cuotas de $ 89.990");
    const row = (label: string) => screen.getByText(label, { selector: "dt" }).nextElementSibling;
    expect(row("Categoría")).toHaveTextContent("Hogar");
    expect(row("Pago")).toHaveTextContent("Visa 4417");
    expect(row("Fecha de compra")).toHaveTextContent("15/08/2026");
    expect(row("Espacio")).toHaveTextContent("Mi plata");
    expect(screen.getByLabelText("Volver a Movimientos")).toHaveAttribute("href", "/movimientos");
  });

  it("shows the schedule folded around the current installment", async () => {
    handlers();
    render(<ExpenseDetailView id="e1" />, { wrapper: WithSWR });
    expect(await screen.findByText(/3 de 12/)).toHaveTextContent("3 de 12 · faltan $ 899.900");
    const rows = screen.getAllByRole("button", { name: /^Cuota \d+$/ });
    expect(rows.map((r) => r.getAttribute("aria-label"))).toEqual(["Cuota 1", "Cuota 2", "Cuota 3", "Cuota 4"]);
    expect(rows[0]).toHaveTextContent("Pagada");
    expect(rows[2]).toHaveTextContent("Ahora");
    expect(rows[2]).toHaveTextContent("En el resumen abierto");
    expect(rows[3]).toHaveTextContent("$ 89.990");

    await userEvent.click(screen.getByRole("button", { name: "Ver las 12 cuotas" }));
    expect(screen.getAllByRole("button", { name: /^Cuota \d+$/ })).toHaveLength(12);
  });

  it("marks an installment paid", async () => {
    handlers();
    render(<ExpenseDetailView id="e1" />, { wrapper: WithSWR });
    await userEvent.click(await screen.findByRole("button", { name: "Cuota 3" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Cuota 3 de 12")).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole("button", { name: "Marcar pagada" }));
    await vi.waitFor(() => expect(patched).toContainEqual({ path: "installment 3", body: { isPaid: true } }));
  });

  it("edits the description, date and category", async () => {
    handlers();
    render(<ExpenseDetailView id="e1" />, { wrapper: WithSWR });
    await userEvent.click(await screen.findByRole("button", { name: "Editar gasto" }));
    const input = await screen.findByLabelText("Descripción");
    await userEvent.clear(input);
    await userEvent.type(input, "Heladera nueva");
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));
    await vi.waitFor(() =>
      expect(patched).toContainEqual({ path: "expense", body: { description: "Heladera nueva", spentAt: "2026-08-15", categoryId: "home" } }),
    );
  });

  it("deletes after confirming", async () => {
    handlers();
    vi.mocked(confirm).mockResolvedValue(true);
    render(<ExpenseDetailView id="e1" />, { wrapper: WithSWR });
    await userEvent.click(await screen.findByRole("button", { name: "Eliminar gasto" }));
    await vi.waitFor(() => expect(replace).toHaveBeenCalledWith("/movimientos"));
    expect(patched).toContainEqual({ path: "delete", body: null });
  });

  it("shows how a hogar expense splits", async () => {
    const shared = { ...expense, householdId: hogarSpace.id, installments: 1, amount: 42315, amountBase: 42315, paymentMethodId: "cash", isShared: true };
    const one = installment(1, {
      installmentAmount: 42315,
      installmentAmountBase: 42315,
      shares: [
        { userId: "u1", amountBaseOwed: 21157.5 },
        { userId: "u2", amountBaseOwed: 21157.5 },
      ],
    });
    handlers({ expense: shared, installments: [one] });
    render(<ExpenseDetailView id="e1" />, { wrapper: WithSWR });
    expect(await screen.findByText("Cómo se divide")).toBeInTheDocument();
    expect((await screen.findByText("Luis", { selector: "dt" })).nextElementSibling).toHaveTextContent("$ 21.157,50");
    expect(screen.getByText("Espacio", { selector: "dt" }).nextElementSibling).toHaveTextContent("Casa");
    // Cash in one payment: no schedule.
    expect(screen.queryByText("Cuota")).not.toBeInTheDocument();
  });
});

describe("installment helpers", () => {
  it("finds the current installment and what is left", () => {
    const { current, progress, left } = installmentProgress(twelve);
    expect(current?.installmentNumber).toBe(3);
    expect(progress).toBe(3);
    expect(left).toBe(89990 * 10);
    const allPaid = twelve.map((i) => ({ ...i, isPaid: true }));
    expect(installmentProgress(allPaid)).toMatchObject({ current: undefined, progress: 12, left: 0 });
  });

  it("folds to four rows around the current one", () => {
    const n = (list: Installment[]) => list.map((i) => i.installmentNumber);
    expect(n(visibleInstallments(twelve, twelve[2]))).toEqual([1, 2, 3, 4]);
    expect(n(visibleInstallments(twelve, twelve[7]))).toEqual([6, 7, 8, 9]);
    expect(n(visibleInstallments(twelve, twelve[11]))).toEqual([9, 10, 11, 12]);
    expect(n(visibleInstallments(twelve))).toEqual([9, 10, 11, 12]);
    expect(n(visibleInstallments(twelve.slice(0, 3)))).toEqual([1, 2, 3]);
  });
});
