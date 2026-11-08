import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HogarOnly, HogarSettings } from "./hogar-settings";
import { API, server, signIn } from "@/test/msw";
import { hogarSpace, personalSpace, WithSWR } from "@/test/spaces";
import { useHouseholdStore } from "@/stores/household";

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
    expect(await screen.findByRole("link", { name: "Crear hogar" })).toHaveAttribute("href", "/hogar/nuevo");
  });

  it("shows the hogar's settings from the Mi plata tab", async () => {
    households([personalSpace, hogarSpace]);
    server.use(
      http.get(`${API}/split`, ({ request }) =>
        HttpResponse.json({ householdId: request.headers.get("x-household-id"), rules: [] }),
      ),
    );
    render(<HogarSettings />, { wrapper: WithSWR });
    expect(await screen.findByRole("heading", { name: "Configuración del hogar" })).toBeInTheDocument();
    expect(screen.getByLabelText("Nombre del hogar")).toHaveValue("Casa");
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
    expect(await screen.findByRole("link", { name: "Crear hogar" })).toBeInTheDocument();
    expect(screen.queryByText("deudas")).not.toBeInTheDocument();
  });
});
