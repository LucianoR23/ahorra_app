import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HogarOnly, HogarSettings } from "./hogar-settings";
import { API, requests, server, signIn } from "@/test/msw";
import { confirm } from "@/lib/confirm";
import { hogarSpace, personalSpace, WithSWR } from "@/test/spaces";
import { useHouseholdStore } from "@/stores/household";

vi.mock("@/lib/confirm", () => ({ confirm: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), push: vi.fn() }) }));

beforeEach(() => {
  signIn({ householdId: personalSpace.id });
  // Fallback for the reads these screens make; tests add specific handlers on top.
  server.use(http.get(`${API}/*`, () => HttpResponse.json([])));
});

const households = (list: unknown[]) => server.use(http.get(`${API}/households`, () => HttpResponse.json(list)));

describe("HogarSettings", () => {
  it("offers to create a hogar when there is none", async () => {
    households([personalSpace]);
    render(<HogarSettings />, { wrapper: WithSWR });
    expect(await screen.findByText("Crear hogar")).toHaveAttribute("href", "/hogar/nuevo");
  });

  it("shows the hogar's settings from the Mi plata tab", async () => {
    households([personalSpace, hogarSpace]);
    server.use(
      http.get(`${API}/split`, ({ request }) =>
        HttpResponse.json({ householdId: request.headers.get("x-household-id"), rules: [] }),
      ),
    );
    render(<HogarSettings />, { wrapper: WithSWR });
    expect(await screen.findByRole("button", { name: /Nombre/ })).toHaveTextContent("Casa");
    // Plan 5.5: a space always sums in pesos, nothing to pick.
    expect(screen.queryByText("Moneda base")).not.toBeInTheDocument();
  });
});

const members = [
  { userId: "u1", email: "ana@example.test", firstName: "Ana", lastName: "Test", role: "owner", joinedAt: "" },
  { userId: "u2", email: "luis@example.test", firstName: "Luis", lastName: "R", role: "member", joinedAt: "" },
];

function hogarHandlers() {
  households([personalSpace, hogarSpace]);
  server.use(
    http.get(`${API}/households/:id/members`, () => HttpResponse.json(members)),
    http.get(`${API}/households/:id/invites`, () => HttpResponse.json([])),
    http.get(`${API}/split`, () =>
      HttpResponse.json({ householdId: "h1", rules: [{ userId: "u1", weight: 50 }, { userId: "u2", weight: 50 }] }),
    ),
  );
}

describe("HogarSettings as owner", () => {
  it("lists the members and takes one out after confirming", async () => {
    hogarHandlers();
    vi.mocked(confirm).mockResolvedValue(true);
    server.use(http.delete(`${API}/households/h1/members/u2`, () => new HttpResponse(null, { status: 204 })));
    render(<HogarSettings />, { wrapper: WithSWR });
    expect(await screen.findByText("Ana Test (vos)")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Opciones de Luis R" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Sacar del hogar" }));
    await waitFor(() => expect(requests().some((r) => r.method === "DELETE" && r.path === "/households/h1/members/u2")).toBe(true));
  });

  it("invites by email and shows the link", async () => {
    hogarHandlers();
    server.use(
      http.post(`${API}/households/h1/invites`, () =>
        HttpResponse.json(
          { invite: { id: "i1", email: "eva@example.test", expiresAt: "2026-11-16T00:00:00Z" }, acceptUrl: "https://app.test/invite/abc", emailSent: true },
          { status: 201 },
        ),
      ),
    );
    render(<HogarSettings />, { wrapper: WithSWR });
    await userEvent.click(await screen.findByRole("button", { name: "Invitar a alguien" }));
    const sheet = await screen.findByRole("dialog", { name: "Invitar al hogar" });
    await userEvent.type(within(sheet).getByLabelText("Email"), "eva@example.test");
    await userEvent.click(within(sheet).getByRole("button", { name: "Enviar invitación" }));
    expect(await within(sheet).findByDisplayValue("https://app.test/invite/abc")).toBeInTheDocument();
  });

  it("changes the split only when it adds up to 100", async () => {
    hogarHandlers();
    server.use(http.patch(`${API}/split`, () => HttpResponse.json({ householdId: "h1", rules: [] })));
    render(<HogarSettings />, { wrapper: WithSWR });
    await userEvent.click(await screen.findByRole("button", { name: "Cambiar la división" }));
    const sheet = await screen.findByRole("dialog", { name: "Cómo se dividen los gastos" });
    const ana = within(sheet).getByLabelText("Vos");
    await userEvent.clear(ana);
    await userEvent.type(ana, "70");
    expect(within(sheet).getByText(/Suman 120%/)).toBeInTheDocument();
    expect(within(sheet).getByRole("button", { name: "Guardar" })).toBeDisabled();
    const luis = within(sheet).getByLabelText("Luis R");
    await userEvent.clear(luis);
    await userEvent.type(luis, "30");
    await userEvent.click(within(sheet).getByRole("button", { name: "Guardar" }));
    await waitFor(() => {
      const r = requests().find((x) => x.method === "PATCH" && x.path === "/split");
      expect(r && JSON.parse(r.body)).toMatchObject({ items: [{ userId: "u1", weight: 70 }, { userId: "u2", weight: 30 }] });
    });
  });

  it("a member sees it read-only and can leave", async () => {
    hogarHandlers();
    server.use(http.get(`${API}/households`, () => HttpResponse.json([personalSpace, { ...hogarSpace, createdBy: "u2" }])));
    render(<HogarSettings />, { wrapper: WithSWR });
    expect(await screen.findByText("Solo el dueño puede cambiarlo.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Invitar a alguien" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cambiar la división" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Salir del hogar" })).toBeInTheDocument();
  });
});

describe("HogarOnly", () => {
  it("shows the content inside the hogar", async () => {
    households([personalSpace, hogarSpace]);
    useHouseholdStore.setState({ currentId: hogarSpace.id });
    render(<HogarOnly>{(id) => <p>deudas de {id}</p>}</HogarOnly>, { wrapper: WithSWR });
    expect(await screen.findByText("deudas de h1")).toBeInTheDocument();
  });

  it("from Mi plata, offers to go to the hogar", async () => {
    households([personalSpace, hogarSpace]);
    render(<HogarOnly>{() => <p>deudas</p>}</HogarOnly>, { wrapper: WithSWR });
    await userEvent.click(await screen.findByRole("button", { name: "Ir al hogar" }));
    expect(useHouseholdStore.getState().currentId).toBe(hogarSpace.id);
  });

  it("without a hogar, offers to create one", async () => {
    households([personalSpace]);
    render(<HogarOnly>{() => <p>deudas</p>}</HogarOnly>, { wrapper: WithSWR });
    expect(await screen.findByText("Crear hogar")).toHaveAttribute("href", "/hogar/nuevo");
    expect(screen.queryByText("deudas")).not.toBeInTheDocument();
  });
});
