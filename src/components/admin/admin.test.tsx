import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AdminAuditEvent, AdminOverview as Overview, AdminUser } from "@/lib/api/hooks";
import { API, requests, resetRequests, server, signIn } from "@/test/msw";
import { WithSWR } from "@/test/spaces";
import { useAuthStore } from "@/stores/auth";
import { AdminAccountDetail } from "./admin-account-detail";
import { AdminAccounts } from "./admin-accounts";
import { AdminAudit } from "./admin-audit";
import { AdminHouseholds } from "./admin-households";
import { AdminOverview } from "./admin-overview";
import { AdminShell } from "./admin-shell";

// Superadmin area (plan 1.11).

let pathname = "/admin";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => pathname,
}));
vi.mock("@/components/auth-gate", () => ({ AuthGate: ({ children }: { children: React.ReactNode }) => children }));
vi.mock("@/components/brand-logo", () => ({ BrandLogo: () => <span>logo</span> }));

function asSuperadmin() {
  signIn();
  const user = useAuthStore.getState().user!;
  useAuthStore.setState({ user: { ...user, isSuperadmin: true } });
}

const ana: AdminUser = {
  id: "u2",
  email: "ana.perez@example.test",
  firstName: "Ana",
  lastName: "Pérez",
  createdAt: "2026-11-03T12:00:00Z",
  verifiedAt: null,
  onboardedAt: "2026-11-03T12:05:00Z",
  deletedAt: null,
  lastSeenAt: "2026-11-10T12:00:00Z",
  isSuperadmin: false,
  households: 1,
};

function event(over: Partial<AdminAuditEvent>): AdminAuditEvent {
  return {
    id: "e1",
    action: "login.success",
    userId: "u2",
    userEmail: ana.email,
    actorId: "u2",
    actorEmail: ana.email,
    target: "",
    device: "Chrome en Windows",
    createdAt: "2026-11-10T15:00:00Z",
    ...over,
  };
}

beforeEach(() => {
  resetRequests();
  pathname = "/admin";
});

describe("AdminShell", () => {
  it("is a plain 404 for anyone who isn't a superadmin", () => {
    signIn();
    render(<AdminShell>secret</AdminShell>, { wrapper: WithSWR });
    expect(screen.getByText("No encontramos esta página")).toBeInTheDocument();
    expect(screen.queryByText("secret")).not.toBeInTheDocument();
  });

  it("has its own navigation and a way back to the app", () => {
    asSuperadmin();
    pathname = "/admin/cuentas/u2";
    render(<AdminShell>contenido</AdminShell>, { wrapper: WithSWR });
    expect(screen.getByText("contenido")).toBeInTheDocument();
    const [sidebar] = screen.getAllByRole("navigation", { name: "Superadmin" });
    expect(within(sidebar).getByRole("link", { name: "Cuentas" })).toHaveAttribute("aria-current", "page");
    expect(within(sidebar).getByRole("link", { name: "Resumen" })).not.toHaveAttribute("aria-current");
    expect(screen.getAllByRole("link", { name: "Volver a la app" })[0]).toHaveAttribute("href", "/");
    // None of the app's own navigation.
    expect(screen.queryByRole("link", { name: "Cargar gasto" })).not.toBeInTheDocument();
  });
});

describe("AdminOverview", () => {
  it("shows counts, newest month first", async () => {
    asSuperadmin();
    const o: Overview = {
      accounts: { total: 1280, newWeek: 12, newMonth: 30, verified: 900, active: 410 },
      households: { active: 41, deleted: 3 },
      waitlist: 77,
      movements: [
        { month: "2026-10", expenses: 2900, incomes: 80 },
        { month: "2026-11", expenses: 3200, incomes: 95 },
      ],
    };
    server.use(http.get(`${API}/admin/overview`, () => HttpResponse.json(o)));
    render(<AdminOverview />, { wrapper: WithSWR });
    expect(await screen.findByText("1.280")).toBeInTheDocument();
    expect(screen.getByText("12 nuevas en 7 días · 30 este mes")).toBeInTheDocument();
    expect(screen.getByText("3 borrados")).toBeInTheDocument();
    const rows = within(screen.getByRole("region", { name: "Movimientos cargados" })).getAllByRole("listitem");
    expect(rows[0]).toHaveTextContent(/noviembre.*2026/);
    expect(rows[0]).toHaveTextContent("3.200 gastos · 95 ingresos");
  });
});

describe("AdminAccounts", () => {
  it("searches and links each account to its page", async () => {
    asSuperadmin();
    server.use(
      http.get(`${API}/admin/users`, ({ request }) => {
        const q = new URL(request.url).searchParams.get("q");
        return HttpResponse.json({ items: q === "nadie" ? null : [ana], nextOffset: null });
      }),
    );
    render(<AdminAccounts />, { wrapper: WithSWR });
    const link = await screen.findByRole("link", { name: /Ana Pérez/ });
    expect(link).toHaveAttribute("href", "/admin/cuentas/u2");
    expect(within(link).getByText("Sin verificar")).toBeInTheDocument();
    expect(within(link).getByText("1 hogar")).toBeInTheDocument();

    await userEvent.type(screen.getByRole("searchbox", { name: "Buscar por email o nombre" }), "nadie");
    expect(await screen.findByText("Ninguna cuenta coincide.")).toBeInTheDocument();
    expect(requests().some((r) => r.path === "/admin/users" && r.query?.q === "nadie")).toBe(true);
  });
});

describe("AdminAccountDetail", () => {
  it("shows metadata, spaces by name and the account's activity", async () => {
    asSuperadmin();
    server.use(
      http.get(`${API}/admin/users/u2`, () =>
        HttpResponse.json({
          ...ana,
          pendingEmail: null,
          hasPassword: true,
          providers: ["google"],
          activeSessions: 2,
          spaces: [
            { id: "h1", name: "Casa", kind: "shared", role: "owner", joinedAt: ana.createdAt, deletedAt: null, members: 3 },
            { id: "p1", name: "Personal", kind: "personal", role: "owner", joinedAt: ana.createdAt, deletedAt: null, members: 1 },
          ],
        }),
      ),
      http.get(`${API}/admin/audit`, () => HttpResponse.json({ items: [event({})], nextCursor: null })),
    );
    render(<AdminAccountDetail id="u2" />, { wrapper: WithSWR });
    expect(await screen.findByRole("heading", { name: "Ana Pérez" })).toBeInTheDocument();
    expect(screen.getByText("Contraseña y Google")).toBeInTheDocument();
    expect(screen.getByText("Dueño · 3 miembros")).toBeInTheDocument();
    expect(screen.getByText("Mi plata")).toBeInTheDocument();
    expect(await screen.findByText("Inicio de sesión")).toBeInTheDocument();
    await waitFor(() => expect(requests().some((r) => r.path === "/admin/audit" && r.query?.userId === "u2")).toBe(true));
  });
});

describe("AdminAudit", () => {
  it("filters, names who did a superadmin action and pages", async () => {
    asSuperadmin();
    server.use(
      http.get(`${API}/admin/audit`, ({ request }) => {
        const p = new URL(request.url).searchParams;
        if (p.get("group") === "admin") {
          return HttpResponse.json({
            items: [
              event({
                id: "e9",
                action: "admin.household_restored",
                userId: null,
                userEmail: null,
                actorId: "u1",
                actorEmail: "root@example.test",
              }),
            ],
            nextCursor: null,
          });
        }
        if (p.get("cursor")) {
          return HttpResponse.json({ items: [event({ id: "e2", action: "login.failed" })], nextCursor: null });
        }
        return HttpResponse.json({ items: [event({})], nextCursor: "c1" });
      }),
    );
    render(<AdminAudit />, { wrapper: WithSWR });
    expect(await screen.findByText("Inicio de sesión")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: ana.email })).toHaveAttribute("href", "/admin/cuentas/u2");

    await userEvent.click(screen.getByRole("button", { name: "Ver más" }));
    expect(await screen.findByText("Intento de inicio de sesión fallido")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Superadmin" }));
    expect(await screen.findByText("Superadmin restauró un hogar")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "root@example.test" })).toBeInTheDocument();
  });
});

const deleted = {
  id: "hh-deleted-1",
  name: "Casa vieja",
  baseCurrency: "ARS",
  createdBy: "u9",
  createdAt: "2026-01-01T00:00:00Z",
  deletedAt: "2026-11-02T12:00:00Z",
  owner: { id: "u9", email: "luis@example.test", firstName: "Luis", lastName: "R" },
};

describe("AdminHouseholds", () => {
  it("survives an empty list sent as null", async () => {
    asSuperadmin();
    server.use(http.get(`${API}/admin/households/deleted`, () => HttpResponse.json(null)));
    render(<AdminHouseholds />, { wrapper: WithSWR });
    expect(await screen.findByText("No hay hogares borrados.")).toBeInTheDocument();
  });

  it("purges a deleted hogar only after typing its name", async () => {
    asSuperadmin();
    server.use(
      http.get(`${API}/admin/households/deleted`, () => HttpResponse.json([deleted])),
      http.delete(`${API}/admin/households/:id/purge`, () => new HttpResponse(null, { status: 204 })),
    );
    render(<AdminHouseholds />, { wrapper: WithSWR });
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
