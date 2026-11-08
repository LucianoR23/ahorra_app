import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CategorySelect } from "./category-select";

const categories = [
  { id: "luz", name: "Luz", parentId: "serv" },
  { id: "super", name: "Súper" },
  { id: "serv", name: "Servicios" },
];

describe("CategorySelect", () => {
  it("lists each category followed by its subcategories, and picks one", async () => {
    const onValueChange = vi.fn();
    render(
      <CategorySelect value="" onValueChange={onValueChange} categories={categories} emptyLabel="Sin categoría" aria-label="Categoría" />,
    );
    expect(screen.getByRole("combobox", { name: "Categoría" })).toHaveTextContent("Sin categoría");

    await userEvent.click(screen.getByRole("combobox", { name: "Categoría" }));
    const options = await screen.findAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual(["Sin categoría", "Servicios", "Luz", "Súper"]);
    expect(options[2]).toHaveClass("pl-11");

    await userEvent.click(options[2]);
    expect(onValueChange).toHaveBeenCalledWith("luz");
  });

  it("shows the chosen category's name", () => {
    render(<CategorySelect value="luz" onValueChange={() => {}} categories={categories} emptyLabel="Sin categoría" aria-label="Categoría" />);
    expect(screen.getByRole("combobox", { name: "Categoría" })).toHaveTextContent("Luz");
  });
});
