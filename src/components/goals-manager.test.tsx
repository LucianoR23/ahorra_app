import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { SWRConfig } from "swr";
import { swrTestConfig } from "@/test/spaces";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { API, requests, server, signIn } from "@/test/msw";
import { confirm } from "@/lib/confirm";
import { GoalsManager } from "./goals-manager";

vi.mock("@/lib/confirm", () => ({ confirm: vi.fn() }));

const goal = (over: Record<string, unknown>) => ({
  id: "g1",
  householdId: "h1",
  scope: "household",
  goalType: "total_limit",
  targetAmount: 100,
  currency: "USD",
  period: "monthly",
  isActive: true,
  createdBy: "u1",
  createdAt: "2026-03-01T00:00:00Z",
  updatedAt: "2026-03-01T00:00:00Z",
  ...over,
});

// Progress exactly as the API answers it (0.1): current and targetAmountBase
// in the base currency, targetAmount in the goal's currency, status "ok".
const usdGoal = {
  goal: goal({}),
  periodStart: "2026-03-01",
  periodEnd: "2026-03-31",
  currentAmount: 90000,
  targetAmount: 100,
  targetAmountBase: 150000,
  baseCurrency: "ARS",
  fxRate: 1500,
  percent: 60,
  status: "ok",
};
const weeklyArsGoal = {
  ...usdGoal,
  goal: goal({ id: "g2", currency: "ARS", targetAmount: 50000, period: "weekly" }),
  currentAmount: 10000,
  targetAmount: 50000,
  targetAmountBase: 50000,
  fxRate: null,
  percent: 20,
};

function renderGoals() {
  return render(
    <SWRConfig value={swrTestConfig}>
      <GoalsManager />
    </SWRConfig>,
  );
}

beforeEach(() => {
  signIn();
  server.use(
    http.get(`${API}/goals/progress`, () => HttpResponse.json([usdGoal, weeklyArsGoal])),
    http.get(`${API}/categories`, () => HttpResponse.json([])),
    http.get(`${API}/households`, () => HttpResponse.json([{ id: "h1", name: "Casa", baseCurrency: "ARS" }])),
    http.get(`${API}/households/h1/members`, () => HttpResponse.json([])),
  );
});

describe("GoalsManager", () => {
  it("measures a USD goal against its target converted with today's rate, and says so", async () => {
    renderGoals();
    expect(await screen.findByText("$ 150.000")).toBeInTheDocument();
    expect(screen.getByText("US$ 100")).toBeInTheDocument();
    const note = screen.getByText(/Calculado con la cotización de hoy/);
    expect(note).toHaveTextContent("Calculado con la cotización de hoy (1 USD = $ 1.500)");
    expect(screen.getAllByText("En camino")).toHaveLength(2); // status "ok" renders
  });

  it("shows weekly goals as weekly and no rate note for base-currency goals", async () => {
    renderGoals();
    expect(await screen.findByText("$ 50.000")).toBeInTheDocument();
    expect(screen.getByText(/Semanal/)).toBeInTheDocument();
    expect(screen.getAllByText(/Calculado con la cotización de hoy/)).toHaveLength(1);
  });

  it("edits a goal from its sheet", async () => {
    server.use(http.patch(`${API}/goals/g2`, () => HttpResponse.json(weeklyArsGoal.goal)));
    renderGoals();
    await userEvent.click((await screen.findAllByRole("button", { name: "Editar Límite total" }))[1]);
    const sheet = await screen.findByRole("dialog");
    const amount = within(sheet).getByLabelText("Monto");
    await userEvent.clear(amount);
    await userEvent.type(amount, "80000");
    await userEvent.click(within(sheet).getByRole("radio", { name: "Mensual" }));
    await userEvent.click(within(sheet).getByRole("button", { name: "Guardar" }));
    await waitFor(() => expect(body("PATCH")).toMatchObject({ targetAmount: 80000, currency: "ARS", period: "monthly" }));
  });

  it("pauses and deletes from the sheet", async () => {
    server.use(
      http.patch(`${API}/goals/g1/active`, () => new HttpResponse(null, { status: 204 })),
      http.delete(`${API}/goals/g1`, () => new HttpResponse(null, { status: 204 })),
    );
    vi.mocked(confirm).mockResolvedValue(true);
    renderGoals();
    await userEvent.click((await screen.findAllByRole("button", { name: "Editar Límite total" }))[0]);
    await userEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Pausar objetivo" }));
    await waitFor(() => expect(requests().some((r) => r.method === "PATCH" && r.path === "/goals/g1/active")).toBe(true));

    await userEvent.click((await screen.findAllByRole("button", { name: "Editar Límite total" }))[0]);
    await userEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Eliminar objetivo" }));
    await waitFor(() => expect(requests().some((r) => r.method === "DELETE" && r.path === "/goals/g1")).toBe(true));
  });

  it("creates a goal for one person of the hogar", async () => {
    server.use(
      http.get(`${API}/households/h1/members`, () =>
        HttpResponse.json([
          { userId: "u1", email: "", firstName: "Ana", lastName: "T", role: "owner", joinedAt: "" },
          { userId: "u2", email: "", firstName: "Luis", lastName: "R", role: "member", joinedAt: "" },
        ]),
      ),
      http.post(`${API}/goals`, () => HttpResponse.json(goal({ id: "new" }), { status: 201 })),
    );
    renderGoals();
    await userEvent.click(await screen.findByRole("button", { name: "Nuevo objetivo" }));
    const sheet = await screen.findByRole("dialog", { name: "Nuevo objetivo" });
    await userEvent.click(within(sheet).getByRole("radio", { name: "Una persona" }));
    await userEvent.click(within(sheet).getByLabelText("Persona"));
    await userEvent.click(await screen.findByRole("option", { name: "Luis R" }));
    await userEvent.type(within(sheet).getByLabelText("Monto"), "300000");
    await userEvent.click(within(sheet).getByRole("button", { name: "Crear objetivo" }));
    await waitFor(() =>
      expect(body("POST")).toMatchObject({ scope: "user", userId: "u2", goalType: "total_limit", targetAmount: 300000, currency: "ARS", period: "monthly" }),
    );
  });

  it("only asks who it is for inside a hogar", async () => {
    renderGoals();
    await userEvent.click(await screen.findByRole("button", { name: "Nuevo objetivo" }));
    const sheet = await screen.findByRole("dialog", { name: "Nuevo objetivo" });
    expect(within(sheet).queryByRole("radio", { name: "Una persona" })).not.toBeInTheDocument();
  });

  it("invites to create one when there are none", async () => {
    server.use(http.get(`${API}/goals/progress`, () => HttpResponse.json([])));
    renderGoals();
    expect(await screen.findByText("Todavía no tenés objetivos")).toBeInTheDocument();
  });
});

function body(method: string) {
  const req = requests().filter((r) => r.method === method).at(-1);
  return req ? JSON.parse(req.body) : undefined;
}
