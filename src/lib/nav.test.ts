import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { BOTTOM_NAV, MORE_GROUPS, SIDEBAR_NAV, isActive, visibleFor, type NavItem } from "./nav";

const all: NavItem[] = [...BOTTOM_NAV.left, ...BOTTOM_NAV.right, ...SIDEBAR_NAV, ...MORE_GROUPS.flatMap((g) => g.items)];

describe("navigation (plan 1.10a)", () => {
  it("bottom nav is Inicio · Movimientos · + · Tarjetas · Más", () => {
    expect(BOTTOM_NAV.left.map((n) => n.label)).toEqual(["Inicio", "Movimientos"]);
    expect(BOTTOM_NAV.right.map((n) => n.label)).toEqual(["Tarjetas", "Más"]);
  });

  it("every link points at an existing route", () => {
    const appDir = join(__dirname, "..", "app");
    for (const { href } of all) {
      expect(existsSync(join(appDir, href, "page.tsx")), href).toBe(true);
    }
  });

  it("ids are unique inside Más and only Superadmin is admin-only", () => {
    const more = MORE_GROUPS.flatMap((g) => g.items);
    expect(new Set(more.map((i) => i.id)).size).toBe(more.length);
    expect(all.filter((i) => i.adminOnly).map((i) => i.href)).toEqual(["/admin"]);
  });

  it("lights the right tab", () => {
    expect(isActive("/", "/")).toBe(true);
    expect(isActive("/movimientos", "/")).toBe(false);
    expect(isActive("/movimientos/e1", "/movimientos")).toBe(true);
    expect(isActive("/hogares", "/hogar")).toBe(false);
    // Screens without their own tab live under "Más".
    expect(isActive("/recurrentes", "/mas")).toBe(true);
    expect(isActive("/mas", "/mas")).toBe(true);
    expect(isActive("/tarjetas", "/mas")).toBe(false);
    expect(isActive("/agregar", "/mas")).toBe(false);
  });

  it("shows hogar items only to members and the create entry only to the rest", () => {
    const hogar = MORE_GROUPS.find((g) => g.title === "Hogar")!.items;
    const solo = { isAdmin: false, hasHogar: false };
    const member = { isAdmin: false, hasHogar: true };
    expect(hogar.filter((i) => visibleFor(i, solo)).map((i) => i.label)).toEqual(["Compartir gastos"]);
    expect(hogar.filter((i) => visibleFor(i, member)).map((i) => i.label)).toEqual([
      "Hogar y miembros",
      "Cuentas entre ustedes",
    ]);
    const admin = all.find((i) => i.adminOnly)!;
    expect(visibleFor(admin, solo)).toBe(false);
    expect(visibleFor(admin, { isAdmin: true, hasHogar: false })).toBe(true);
  });
});
