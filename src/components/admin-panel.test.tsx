import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it } from "vitest";
import { AdminPanel } from "./admin-panel";
import { API, requests, resetRequests, server, signIn } from "@/test/msw";
import { WithSWR } from "@/test/spaces";
import { useAuthStore } from "@/stores/auth";

// Superadmin (plan 1.10b, the grouped list of Más).

const deleted = {
  id: "hh-deleted-1",
  name: "Casa vieja",
  baseCurrency: "ARS",
  createdBy: "u9",
  createdAt: "2026-01-01T00:00:00Z",
  deletedAt: "2026-11-02T12:00:00Z",
  owner: { id: "u9", email: "luis@example.test", firstName: "Luis", lastName: "R" },
};

function asSuperadmin() {
  signIn();
  const user = useAuthStore.getState().user!;
  useAuthStore.setState({ user: { ...user, isSuperadmin: true } });
}

beforeEach(() => resetRequests());

describe("AdminPanel", () => {
  it("tells a regular account the section is not for it", () => {
    signIn();
    render(<AdminPanel />, { wrapper: WithSWR });
    expect(screen.getByText("Esta sección no es para tu cuenta")).toBeInTheDocument();
  });

  it("survives an empty list sent as null", async () => {
    asSuperadmin();
    server.use(http.get(`${API}/admin/households/deleted`, () => HttpResponse.json(null)));
    render(<AdminPanel />, { wrapper: WithSWR });
    expect(await screen.findByText("No hay hogares borrados.")).toBeInTheDocument();
  });

  it("purges a deleted hogar only after typing its name", async () => {
    asSuperadmin();
    server.use(
      http.get(`${API}/admin/households/deleted`, () => HttpResponse.json([deleted])),
      http.delete(`${API}/admin/households/:id/purge`, () => new HttpResponse(null, { status: 204 })),
    );
    render(<AdminPanel />, { wrapper: WithSWR });
    await userEvent.click(await screen.findByRole("button", { name: /Casa vieja/ }));
    const sheet = await screen.findByRole("dialog", { name: "Casa vieja" });
    expect(within(sheet).getByText("luis@example.test")).toBeInTheDocument();
    const purge = within(sheet).getByRole("button", { name: "Eliminar para siempre" });
    expect(purge).toBeDisabled();
    await userEvent.type(within(sheet).getByLabelText(/para confirmar/), "Casa vieja");
    await userEvent.click(purge);
    await waitFor(() => expect(requests().some((r) => r.path === "/admin/households/hh-deleted-1/purge")).toBe(true));
  });
});
