import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChangePasswordItem } from "./change-password-card";
import { DeleteAccountItem } from "./delete-account-card";
import { ProfileConfig } from "./profile-config";
import { useAuthStore } from "@/stores/auth";
import { API, requests, resetRequests, server, signIn } from "@/test/msw";

// Ajustes and Seguridad (plan 1.10b, the grouped list): rows open sheets.

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));
vi.mock("@/lib/push", () => ({ unsubscribePush: vi.fn().mockResolvedValue(undefined) }));

const me = { id: "u1", email: "ana@example.test", firstName: "Ana", lastName: "Test", isSuperadmin: false };

beforeEach(() => {
  signIn({ token: "tk" });
  resetRequests();
  replace.mockClear();
});

const body = (method: string, path: string) => {
  const r = requests().filter((x) => x.method === method && x.path === path).at(-1);
  return r ? JSON.parse(r.body) : undefined;
};

describe("ProfileConfig", () => {
  it("shows name and email as rows and edits them in the sheet", async () => {
    server.use(http.patch(`${API}/me`, () => HttpResponse.json({ ...me, firstName: "Anita" })));
    render(<ProfileConfig />);
    const name = screen.getByRole("button", { name: /Nombre/ });
    expect(name).toHaveTextContent("Ana Test");
    expect(screen.getByRole("button", { name: /Email/ })).toHaveTextContent("ana@example.test");

    await userEvent.click(name);
    const sheet = await screen.findByRole("dialog", { name: "Tu perfil" });
    const first = within(sheet).getByLabelText("Nombre");
    await userEvent.clear(first);
    await userEvent.type(first, "Anita");
    await userEvent.click(within(sheet).getByRole("button", { name: "Guardar" }));
    await waitFor(() => expect(body("PATCH", "/me")).toEqual({ firstName: "Anita" }));
    await waitFor(() => expect(useAuthStore.getState().user?.firstName).toBe("Anita"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("says when the email is taken", async () => {
    server.use(http.patch(`${API}/me`, () => HttpResponse.json({ error: { code: "conflict", message: "taken" } }, { status: 409 })));
    render(<ProfileConfig />);
    await userEvent.click(screen.getByRole("button", { name: /Email/ }));
    const sheet = await screen.findByRole("dialog");
    const email = within(sheet).getByLabelText("Email");
    await userEvent.clear(email);
    await userEvent.type(email, "luis@example.test");
    await userEvent.click(within(sheet).getByRole("button", { name: "Guardar" }));
    expect(await within(sheet).findByText("Ese email ya está en uso")).toBeInTheDocument();
  });
});

describe("ChangePasswordItem", () => {
  it("opens the form in a sheet and says when the current one is wrong", async () => {
    server.use(
      http.post(`${API}/auth/change-password`, () =>
        HttpResponse.json({ error: { code: "unauthorized", message: "bad" } }, { status: 401 }),
      ),
    );
    render(<ChangePasswordItem />);
    await userEvent.click(screen.getByRole("button", { name: "Cambiar contraseña" }));
    const sheet = await screen.findByRole("dialog", { name: "Cambiar contraseña" });
    await userEvent.type(within(sheet).getByLabelText("Contraseña actual"), "Vieja123!");
    await userEvent.type(within(sheet).getByLabelText("Nueva contraseña"), "Nueva-Clave-2026!");
    await userEvent.type(within(sheet).getByLabelText("Confirmar nueva contraseña"), "Nueva-Clave-2026!");
    await userEvent.click(within(sheet).getByRole("button", { name: "Cambiar contraseña" }));
    expect(await within(sheet).findByText("Contraseña actual incorrecta")).toBeInTheDocument();
  });
});

describe("DeleteAccountItem", () => {
  it("deletes only after typing ELIMINAR", async () => {
    server.use(http.delete(`${API}/me`, () => new HttpResponse(null, { status: 204 })));
    render(<DeleteAccountItem />);
    await userEvent.click(screen.getByRole("button", { name: "Eliminar mi cuenta" }));
    const sheet = await screen.findByRole("dialog", { name: "¿Eliminar tu cuenta?" });
    const confirmButton = within(sheet).getByRole("button", { name: "Eliminar cuenta" });
    expect(confirmButton).toBeDisabled();
    await userEvent.type(within(sheet).getByLabelText(/para confirmar/), "eliminar");
    await userEvent.click(confirmButton);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/login"));
    expect(requests().some((r) => r.method === "DELETE" && r.path === "/me")).toBe(true);
  });
});
