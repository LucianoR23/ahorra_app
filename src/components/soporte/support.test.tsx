import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SupportDetail } from "./support-detail";
import { SupportForm } from "./support-form";
import { SupportList } from "./support-list";
import { API, requests, resetRequests, server, signIn } from "@/test/msw";
import { WithSWR } from "@/test/spaces";

// Soporte (plan 1.10b): the Movimientos list, the form and the report.

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace: vi.fn() }) }));
vi.mock("@/components/ui/info-help", () => ({ InfoHelp: () => null }));
vi.mock("@/lib/support-metadata", () => ({ captureClientMetadata: () => ({}) }));

const summary = (id: string, over: Record<string, unknown> = {}) => ({
  id,
  type: "bug",
  subject: "No carga Tarjetas",
  description_preview: "Se queda en blanco",
  status: "respondido",
  priority: "media",
  attachments_count: 1,
  public_messages_count: 2,
  created_at: "2026-11-09T13:00:00Z",
  updated_at: "2026-11-09T13:00:00Z",
  ...over,
});

beforeEach(() => {
  signIn();
  resetRequests();
  push.mockReset();
});

describe("SupportList", () => {
  it("lists your reports with their status and filters the open ones", async () => {
    server.use(
      http.get(`${API}/support/tickets/mine`, () =>
        HttpResponse.json({ items: [summary("t1"), summary("t2", { subject: "Modo oscuro", type: "improvement", status: "resuelto" })] }),
      ),
    );
    render(<SupportList />, { wrapper: WithSWR });
    const row = await screen.findByRole("link", { name: /No carga Tarjetas/ });
    expect(row).toHaveAttribute("href", "/soporte/t1");
    expect(row).toHaveTextContent("Respondido");
    expect(screen.getByRole("link", { name: /Modo oscuro/ })).toHaveTextContent("Resuelto");
    await userEvent.click(screen.getByRole("button", { name: "Solo abiertos" }));
    expect(screen.queryByRole("link", { name: /Modo oscuro/ })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Nuevo reporte")).toHaveAttribute("href", "/soporte/nuevo");
  });

  it("invites to report when there is nothing, even with a null page", async () => {
    server.use(http.get(`${API}/support/tickets/mine`, () => HttpResponse.json({ items: null })));
    render(<SupportList />, { wrapper: WithSWR });
    expect(await screen.findByText("Todavía no reportaste nada")).toBeInTheDocument();
  });
});

describe("SupportForm", () => {
  it("sends an improvement and opens it", async () => {
    server.use(http.post(`${API}/support/tickets`, () => HttpResponse.json({ ...summary("new"), description: "x", attachments: [] }, { status: 201 })));
    render(<SupportForm />, { wrapper: WithSWR });
    await userEvent.click(screen.getByRole("radio", { name: "Mejora" }));
    await userEvent.type(screen.getByLabelText("Asunto"), "Exportar a Excel");
    await userEvent.type(screen.getByLabelText("Descripción"), "Estaría bueno bajar los movimientos.");
    await userEvent.click(screen.getByRole("button", { name: "Enviar reporte" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/soporte/new"));
    expect(requests().some((r) => r.method === "POST" && r.path === "/support/tickets")).toBe(true);
  });
});

describe("SupportDetail", () => {
  it("shows the report and its conversation, and sends a reply", async () => {
    server.use(
      http.get(`${API}/support/tickets/t1`, () =>
        HttpResponse.json({
          id: "t1",
          app_id: "valuo",
          reporter_user_id: "u1",
          reporter_email: "ana@example.test",
          type: "bug",
          subject: "No carga Tarjetas",
          description: "Se queda en blanco al abrirla.",
          status: "respondido",
          priority: "media",
          attachments: null,
          messages: [{ id: "m1", author_type: "admin", body: "¿Qué navegador usás?", created_at: "2026-11-09T14:00:00Z" }],
          created_at: "2026-11-09T13:00:00Z",
          updated_at: "2026-11-09T14:00:00Z",
        }),
      ),
      http.post(`${API}/support/tickets/t1/messages`, () =>
        HttpResponse.json({ id: "m2", author_type: "user", body: "Chrome", created_at: "2026-11-09T14:05:00Z" }, { status: 201 }),
      ),
    );
    render(<SupportDetail id="t1" />, { wrapper: WithSWR });
    expect(await screen.findByRole("heading", { name: "No carga Tarjetas" })).toBeInTheDocument();
    expect(screen.getByText("Respondido")).toBeInTheDocument();
    const thread = screen.getByRole("region", { name: "Conversación" });
    expect(within(thread).getByText("¿Qué navegador usás?")).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Tu mensaje"), "Chrome");
    await userEvent.click(screen.getByRole("button", { name: "Enviar" }));
    await waitFor(() => expect(requests().some((r) => r.method === "POST" && r.path === "/support/tickets/t1/messages")).toBe(true));
  });
});
