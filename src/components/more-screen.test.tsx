import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MoreScreen } from "./more-screen";
import { API, requests, server, signIn } from "@/test/msw";
import { hogarSpace, personalSpace, WithSWR } from "@/test/spaces";
import { useAuthStore } from "@/stores/auth";

const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
  usePathname: () => "/mas",
}));
vi.mock("@/components/dev-signature", () => ({ DevSignature: () => null }));

beforeEach(() => {
  replace.mockClear();
  signIn({ householdId: personalSpace.id });
});

describe("MoreScreen (design `Mas`)", () => {
  it("lists the groups, with only the create entry for users without a hogar", async () => {
    server.use(http.get(`${API}/households`, () => HttpResponse.json([personalSpace])));
    render(<MoreScreen />, { wrapper: WithSWR });

    expect(screen.getByRole("heading", { level: 1, name: "Más" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Ana Test/ })).toHaveAttribute("href", "/ajustes");
    for (const name of ["Ingresos", "Recurrentes", "Presupuestos y objetivos", "Categorías", "Reportes", "Ajustes"]) {
      expect(screen.getByRole("link", { name })).toBeInTheDocument();
    }
    expect(await screen.findByRole("link", { name: "Compartir gastos" })).toHaveAttribute("href", "/hogar");
    expect(screen.queryByRole("link", { name: "Cuentas entre ustedes" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Superadmin" })).not.toBeInTheDocument();
  });

  it("shows the hogar entries to members, even from Mi plata, and Superadmin to admins", async () => {
    server.use(http.get(`${API}/households`, () => HttpResponse.json([personalSpace, hogarSpace])));
    useAuthStore.setState((s) => ({ user: s.user && { ...s.user, isSuperadmin: true } }));
    render(<MoreScreen />, { wrapper: WithSWR });

    expect(await screen.findByRole("link", { name: /^Cuentas entre ustedes/ })).toHaveAttribute("href", "/deudas");
    expect(screen.getByRole("link", { name: /^Hogar y miembros/ })).toHaveAttribute("href", "/hogar");
    expect(screen.queryByRole("link", { name: "Compartir gastos" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Superadmin" })).toBeInTheDocument();
  });

  it("says how many are in the hogar and who owes whom, even from Mi plata", async () => {
    let balancesFor: string | null = null;
    server.use(
      http.get(`${API}/households`, () => HttpResponse.json([personalSpace, hogarSpace])),
      http.get(`${API}/households/${hogarSpace.id}/members`, () =>
        HttpResponse.json([
          { userId: "u1", email: "", firstName: "Ana", lastName: "Test", role: "owner", joinedAt: "" },
          { userId: "u2", email: "", firstName: "Luis", lastName: "R", role: "member", joinedAt: "" },
        ]),
      ),
      http.get(`${API}/balances/me`, ({ request }) => {
        balancesFor = request.headers.get("x-household-id");
        return HttpResponse.json({ userId: "u1", owe: [], owedToMe: [{ from: "u2", to: "u1", amount: 14880 }], net: 14880 });
      }),
    );
    render(<MoreScreen />, { wrapper: WithSWR });

    expect(await screen.findByRole("link", { name: /Hogar y miembros/ })).toHaveTextContent("2 personas");
    await waitFor(() => expect(screen.getByRole("link", { name: /Cuentas entre ustedes/ })).toHaveTextContent("Luis te debe $ 14.880"));
    expect(balancesFor).toBe(hogarSpace.id);
  });

  it("signs out from the Cuenta group", async () => {
    server.use(
      http.get(`${API}/households`, () => HttpResponse.json([personalSpace])),
      http.post(`${API}/auth/logout`, () => new HttpResponse(null, { status: 204 })),
    );
    render(<MoreScreen />, { wrapper: WithSWR });

    await userEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/login"));
    expect(requests().some((r) => r.method === "POST" && r.path === "/auth/logout")).toBe(true);
  });
});
