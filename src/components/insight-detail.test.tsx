import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InsightDetail } from "./insight-detail";
import { confirm } from "@/lib/confirm";
import { insightLink } from "@/lib/insights";
import { API, requests, server, signIn } from "@/test/msw";
import { WithSWR } from "@/test/spaces";

// A notification (plan 1.10b, the Detalle pattern).

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, push: vi.fn(), back: vi.fn() }), usePathname: () => "/notificaciones/n1" }));
vi.mock("@/lib/confirm", () => ({ confirm: vi.fn() }));

const due = {
  id: "n1",
  householdId: "h1",
  insightDate: "2026-11-09",
  insightType: "card_due_soon",
  title: "Tu Visa vence el jueves",
  body: "El resumen de octubre es de $ 145.000.",
  severity: "warning",
  isRead: false,
  metadata: { payment_method_id: "visa", period_ym: "2026-10" },
  createdAt: "2026-11-09T13:00:00Z",
};

beforeEach(() => {
  signIn();
  replace.mockReset();
  server.use(
    http.get(`${API}/insights/n1`, () => HttpResponse.json(due)),
    http.post(`${API}/insights/n1/read`, () => new HttpResponse(null, { status: 204 })),
    http.delete(`${API}/insights/n1`, () => new HttpResponse(null, { status: 204 })),
  );
});

describe("InsightDetail", () => {
  it("shows the notification, leads to its statement and marks it read", async () => {
    render(<InsightDetail id="n1" />, { wrapper: WithSWR });
    expect(await screen.findByRole("heading", { name: "Tu Visa vence el jueves" })).toBeInTheDocument();
    expect(screen.getByText("Vencimiento de tarjeta")).toBeInTheDocument();
    // The separator depends on the ICU build ("," or "a las").
    expect(screen.getByText(/^9 de noviembre.*10:00$/)).toBeInTheDocument();
    expect(screen.getByText("Ver resumen")).toHaveAttribute("href", "/tarjetas/visa/resumen/2026-10");
    await vi.waitFor(() => expect(requests().some((r) => r.method === "POST" && r.path === "/insights/n1/read")).toBe(true));
  });

  it("deletes after confirming", async () => {
    vi.mocked(confirm).mockResolvedValue(true);
    render(<InsightDetail id="n1" />, { wrapper: WithSWR });
    await userEvent.click(await screen.findByRole("button", { name: "Eliminar notificación" }));
    await vi.waitFor(() => expect(replace).toHaveBeenCalledWith("/notificaciones"));
    expect(requests().some((r) => r.method === "DELETE" && r.path === "/insights/n1")).toBe(true);
  });
});

describe("insightLink", () => {
  it("sends each kind where it can be acted on", () => {
    expect(insightLink({ insightType: "card_due_soon" })).toEqual({ href: "/tarjetas", label: "Ver tarjetas" });
    expect(insightLink({ insightType: "alert_goal_exceeded" })?.href).toBe("/objetivos");
    expect(insightLink({ insightType: "recurring_spike" })?.href).toBe("/recurrentes");
    expect(insightLink({ insightType: "settlement" })?.href).toBe("/deudas");
    expect(insightLink({ insightType: "shared_expense", metadata: { expenseId: "e1" } })).toEqual({ href: "/movimientos/e1", label: "Ver gasto" });
    expect(insightLink({ insightType: "daily_summary" })).toBeUndefined();
  });
});
