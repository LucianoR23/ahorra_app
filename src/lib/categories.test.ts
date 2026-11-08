import { describe, expect, it } from "vitest";
import { categoryTree, parentChoices } from "./categories";

const cats = [
  { id: "luz", name: "Luz", parentId: "serv" },
  { id: "super", name: "Súper", parentId: null },
  { id: "serv", name: "Servicios" },
  { id: "agua", name: "Agua", parentId: "serv" },
  { id: "alm", name: "almacén", parentId: null },
  { id: "orphan", name: "Huérfana", parentId: "gone" },
];

describe("categoryTree", () => {
  it("lists each parent by name followed by its subcategories", () => {
    expect(categoryTree(cats).map((r) => `${r.depth}:${r.category.id}`)).toEqual([
      "0:alm",
      "0:orphan",
      "0:serv",
      "1:agua",
      "1:luz",
      "0:super",
    ]);
  });

  it("handles no data", () => {
    expect(categoryTree(undefined)).toEqual([]);
  });
});

describe("parentChoices", () => {
  it("offers top-level categories other than itself", () => {
    expect(parentChoices(cats).map((c) => c.id)).toEqual(["alm", "serv", "super"]);
    expect(parentChoices(cats, "super").map((c) => c.id)).toEqual(["alm", "serv"]);
    expect(parentChoices(cats, "luz").map((c) => c.id)).toEqual(["alm", "serv", "super"]);
  });

  it("offers none to a category with subcategories", () => {
    expect(parentChoices(cats, "serv")).toEqual([]);
    expect(parentChoices(undefined)).toEqual([]);
  });
});
