import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it } from "vitest";
import { CategoriesManager } from "./categories-manager";
import { API, requests, server, signIn } from "@/test/msw";
import { personalSpace, WithSWR } from "@/test/spaces";

const seeded = {
  id: "c1",
  householdId: personalSpace.id,
  name: "Comida",
  icon: "🍕",
  color: "#E76F51",
  createdAt: "2026-11-01T00:00:00Z",
  updatedAt: "2026-11-01T00:00:00Z",
};

beforeEach(() => {
  signIn({ householdId: personalSpace.id });
  server.use(
    http.get(`${API}/categories`, () => HttpResponse.json([seeded])),
    http.patch(`${API}/categories/c1`, async ({ request }) =>
      HttpResponse.json({ ...seeded, ...((await request.json()) as object) }),
    ),
  );
});

describe("CategoriesManager icons (1.10a)", () => {
  it("shows an old emoji category with its Lucide icon, never the emoji", async () => {
    render(<CategoriesManager />, { wrapper: WithSWR });
    expect(await screen.findByText("Comida")).toBeInTheDocument();
    expect(screen.queryByText("🍕")).not.toBeInTheDocument();
  });

  it("edits the icon with the picker and saves its key", async () => {
    render(<CategoriesManager />, { wrapper: WithSWR });
    await screen.findByText("Comida");
    await userEvent.click(screen.getByRole("button", { name: "Editar Comida" }));

    const picker = await screen.findByRole("radiogroup", { name: "Ícono" });
    // The stored emoji preselects its mapped icon.
    expect(screen.getByRole("radio", { name: "Comida" })).toHaveAttribute("aria-checked", "true");
    expect(picker).toBeInTheDocument();

    await userEvent.click(screen.getByRole("radio", { name: "Súper" }));
    await userEvent.click(screen.getByRole("button", { name: /guardar/i }));

    await waitFor(() => {
      const patch = requests().find((r) => r.method === "PATCH");
      expect(patch && JSON.parse(patch.body)).toMatchObject({ icon: "shopping-cart" });
    });
  });
});
