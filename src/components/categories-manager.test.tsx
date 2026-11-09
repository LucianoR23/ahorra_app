import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CategoriesManager } from "./categories-manager";
import { API, requests, server, signIn } from "@/test/msw";
import { confirm } from "@/lib/confirm";
import { personalSpace, WithSWR } from "@/test/spaces";

vi.mock("@/lib/confirm", () => ({ confirm: vi.fn() }));

const cat = (id: string, name: string, icon: string, parentId: string | null = null) => ({
  id,
  householdId: personalSpace.id,
  parentId,
  name,
  icon,
  color: "#E76F51",
  createdAt: "2026-11-01T00:00:00Z",
  updatedAt: "2026-11-01T00:00:00Z",
});

const categories = [
  cat("luz", "Luz", "zap", "serv"),
  cat("c1", "Comida", "utensils"),
  cat("serv", "Servicios", "lightbulb"),
  cat("gas", "Gas", "flame", "serv"),
];

beforeEach(() => {
  signIn({ householdId: personalSpace.id });
  server.use(
    http.get(`${API}/categories`, () => HttpResponse.json(categories)),
    http.post(`${API}/categories`, async ({ request }) =>
      HttpResponse.json({ ...cat("new", "", "tag"), ...((await request.json()) as object) }, { status: 201 }),
    ),
    http.patch(`${API}/categories/:id`, async ({ params, request }) =>
      HttpResponse.json({
        ...categories.find((c) => c.id === params.id),
        ...((await request.json()) as object),
      }),
    ),
  );
});

function lastBody(method: string) {
  const req = requests().filter((r) => r.method === method).at(-1);
  return req ? JSON.parse(req.body) : undefined;
}

describe("CategoriesManager", () => {
  it("lists each category followed by its subcategories, indented", async () => {
    const { container } = render(<CategoriesManager />, { wrapper: WithSWR });
    await screen.findByText("Comida");
    const rows = [...container.querySelectorAll("[data-depth]")].map(
      (el) => `${el.getAttribute("data-depth")}:${el.textContent}`,
    );
    expect(rows).toEqual(["0:Comida", "0:Servicios2 subcategorías", "1:Gas", "1:Luz"]);
  });

  it("edits the icon with the picker and saves its key", async () => {
    render(<CategoriesManager />, { wrapper: WithSWR });
    await userEvent.click(await screen.findByRole("button", { name: "Editar Comida" }));

    await screen.findByRole("radiogroup", { name: "Ícono" });
    expect(screen.getByRole("radio", { name: "Comida" })).toHaveAttribute("aria-checked", "true");

    await userEvent.click(screen.getByRole("radio", { name: "Súper" }));
    await userEvent.click(screen.getByRole("button", { name: /guardar/i }));

    await waitFor(() => expect(lastBody("PATCH")).toMatchObject({ icon: "shopping-cart", parentId: null }));
  });

  it("creates a subcategory inside a top-level category", async () => {
    render(<CategoriesManager />, { wrapper: WithSWR });
    await userEvent.click(await screen.findByRole("button", { name: "Nueva categoría" }));
    const dialog = await screen.findByRole("dialog");
    await userEvent.type(within(dialog).getByLabelText("Nombre"), "Agua");

    await userEvent.click(within(dialog).getByLabelText("Dentro de"));
    const options = (await screen.findAllByRole("option")).map((o) => o.textContent);
    // Only top-level categories can be parents.
    expect(options).toEqual(["Ninguna (es principal)", "Comida", "Servicios"]);
    await userEvent.click(screen.getByRole("option", { name: "Servicios" }));
    await userEvent.click(within(dialog).getByRole("button", { name: "Crear categoría" }));

    await waitFor(() => expect(lastBody("POST")).toMatchObject({ name: "Agua", parentId: "serv" }));
  });

  it("moves a subcategory to the top level", async () => {
    render(<CategoriesManager />, { wrapper: WithSWR });
    await userEvent.click(await screen.findByRole("button", { name: "Editar Luz" }));
    const dialog = await screen.findByRole("dialog");
    await userEvent.click(within(dialog).getByLabelText("Dentro de"));
    await userEvent.click(await screen.findByRole("option", { name: "Ninguna (es principal)" }));
    await userEvent.click(within(dialog).getByRole("button", { name: /guardar/i }));

    await waitFor(() => expect(lastBody("PATCH")).toMatchObject({ name: "Luz", parentId: null }));
  });

  it("a category with subcategories cannot go inside another one", async () => {
    render(<CategoriesManager />, { wrapper: WithSWR });
    await userEvent.click(await screen.findByRole("button", { name: "Editar Servicios" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(/tiene subcategorías/i)).toBeInTheDocument();
    expect(within(dialog).queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("deletes from the sheet after confirming", async () => {
    vi.mocked(confirm).mockResolvedValue(true);
    server.use(http.delete(`${API}/categories/:id`, () => new HttpResponse(null, { status: 204 })));
    render(<CategoriesManager />, { wrapper: WithSWR });
    await userEvent.click(await screen.findByRole("button", { name: "Editar Servicios" }));
    await userEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Eliminar categoría" }));
    expect(vi.mocked(confirm).mock.calls[0][0].description).toMatch(/subcategorías quedan como categorías comunes/);
    await waitFor(() => expect(requests().some((r) => r.method === "DELETE" && r.path.endsWith("/categories/serv"))).toBe(true));
  });

  it("invites to create one when there are none", async () => {
    server.use(http.get(`${API}/categories`, () => HttpResponse.json([])));
    render(<CategoriesManager />, { wrapper: WithSWR });
    await userEvent.click(await screen.findByRole("button", { name: "Crear categoría" }));
    expect(await screen.findByRole("dialog", { name: "Nueva categoría" })).toBeInTheDocument();
  });
});
